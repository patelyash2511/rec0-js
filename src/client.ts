import { ValidationError } from "./errors.js";
import { HttpClient, DEFAULT_BASE_URL } from "./http.js";
import { resolveRetryOptions, withRetry } from "./retry.js";
import type {
  ExportResult,
  ListOptions,
  ListResult,
  MemoryClientOptions,
  MemoryObject,
  RecallOptions,
  RecallResult,
  UserDeleteResult,
  WhoAmIResult,
} from "./types.js";

const DEFAULT_APP_ID = "default";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RECALL_LIMIT = 40;
const DEFAULT_RETURN_LIMIT = 25;
const DEFAULT_LIST_LIMIT = 20;

function isNodeProcessAvailable(): boolean {
  return typeof process !== "undefined" && !!process?.env;
}

export class Memory {
  private readonly http: HttpClient;
  private readonly userId: string;
  private readonly appId: string;
  private readonly retryOptions: ReturnType<typeof resolveRetryOptions>;

  constructor(options: MemoryClientOptions) {
    if (!options?.userId?.trim()) {
      throw new ValidationError("userId is required");
    }

    const envApiKey = isNodeProcessAvailable() ? process.env.REC0_API_KEY : undefined;
    const apiKey = options.apiKey || envApiKey || "";

    if (!apiKey) {
      throw new ValidationError("apiKey is required. Pass apiKey or set REC0_API_KEY env var.");
    }

    this.userId = options.userId;
    this.appId = options.appId ?? DEFAULT_APP_ID;
    this.retryOptions = resolveRetryOptions(options.retry);

    this.http = new HttpClient({
      apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
      extraHeaders: options.headers,
    });
  }

  async store(content: string): Promise<MemoryObject> {
    if (!content?.trim()) {
      throw new ValidationError("content cannot be empty");
    }
    if (content.length > 2000) {
      throw new ValidationError("content must be 2000 characters or less");
    }

    return withRetry(
      () =>
        this.http.post<MemoryObject>("/v1/memory/store", {
          user_id: this.userId,
          app_id: this.appId,
          content: content.trim(),
        }),
      this.retryOptions
    );
  }

  async recall(query: string, options: RecallOptions = {}): Promise<MemoryObject[]> {
    if (!query?.trim()) {
      throw new ValidationError("query cannot be empty");
    }

    const result = await withRetry(
      () =>
        this.http.post<RecallResult>("/v1/memory/recall", {
          user_id: this.userId,
          app_id: options.appId ?? this.appId,
          query: query.trim(),
          recall_limit: options.recallLimit ?? DEFAULT_RECALL_LIMIT,
          limit: options.limit ?? DEFAULT_RETURN_LIMIT,
          offset: options.offset ?? 0,
        }),
      this.retryOptions
    );

    return result.memories;
  }

  async context(
    query: string,
    options: Pick<RecallOptions, "limit" | "appId"> = {}
  ): Promise<string> {
    const memories = await this.recall(query, {
      limit: options.limit ?? DEFAULT_RETURN_LIMIT,
      appId: options.appId,
    });

    if (memories.length === 0) {
      return "";
    }

    return memories.map((memory) => `- ${memory.content}`).join("\n");
  }

  async list(options: ListOptions = {}): Promise<MemoryObject[]> {
    const params = new URLSearchParams({
      user_id: this.userId,
      app_id: options.appId ?? this.appId,
      limit: String(options.limit ?? DEFAULT_LIST_LIMIT),
      offset: String(options.offset ?? 0),
    });

    const result = await this.http.get<ListResult>(`/v1/memory/list?${params.toString()}`);
    return result.memories;
  }

  async delete(memoryId: string): Promise<void> {
    if (!memoryId?.trim()) {
      throw new ValidationError("memoryId cannot be empty");
    }

    await this.http.delete<null>(`/v1/memory/${encodeURIComponent(memoryId)}`);
  }

  async deleteUser(): Promise<UserDeleteResult> {
    return this.http.delete<UserDeleteResult>(`/v1/users/${encodeURIComponent(this.userId)}`);
  }

  async export(): Promise<ExportResult> {
    return this.http.get<ExportResult>(`/v1/users/${encodeURIComponent(this.userId)}/export`);
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.http.get<{ status: string }>("/health");
      return response?.status === "ok";
    } catch {
      return false;
    }
  }

  async whoami(): Promise<WhoAmIResult> {
    return this.http.get<WhoAmIResult>("/v1/auth/me");
  }

  get user_id(): string {
    return this.userId;
  }

  get app_id(): string {
    return this.appId;
  }
}
