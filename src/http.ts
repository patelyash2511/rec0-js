import { NetworkError, parseApiError } from "./errors.js";

export const DEFAULT_BASE_URL = "https://memorylayer-production.up.railway.app";

export interface HttpClientOptions {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  extraHeaders?: Record<string, string>;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeout = options.timeout;
    this.headers = {
      "Content-Type": "application/json",
      "X-API-Key": options.apiKey,
      ...options.extraHeaders,
    };
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: this.headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error: any) {
      if (error?.name === "AbortError") {
        throw new NetworkError(`Request timed out after ${this.timeout}ms`, error);
      }
      throw new NetworkError(error?.message || "Network request failed", error);
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (response.status === 204) {
      return null as T;
    }

    let parsedBody: any = {};
    try {
      parsedBody = await response.json();
    } catch {
      parsedBody = {};
    }

    if (!response.ok) {
      const parsedError = parseApiError(response.status, parsedBody);
      if (parsedError.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        if (retryAfterHeader) {
          const retryAfterSeconds = Number(retryAfterHeader);
          if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
            parsedError.message = parsedError.message;
            (parsedError as any).retryAfter = retryAfterSeconds;
          }
        }
      }
      throw parsedError;
    }

    return parsedBody as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
