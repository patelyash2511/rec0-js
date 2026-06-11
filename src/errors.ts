export class Rec0Error extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "Rec0Error";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthError extends Rec0Error {
  constructor(message = "Invalid or missing API key") {
    super(message, 401, "invalid_api_key");
    this.name = "AuthError";
  }
}

export class NotFoundError extends Rec0Error {
  constructor(message = "Memory not found") {
    super(message, 404, "memory_not_found");
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends Rec0Error {
  constructor(
    message = "Rate limit exceeded",
    public readonly retryAfter: number = 60
  ) {
    super(message, 429, "rate_limit_exceeded");
    this.name = "RateLimitError";
  }
}

export class ServerError extends Rec0Error {
  constructor(message = "Server error", status = 500) {
    super(message, status, "server_error");
    this.name = "ServerError";
  }
}

export class NetworkError extends Rec0Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message, undefined, "network_error");
    this.name = "NetworkError";
  }
}

export class ValidationError extends Rec0Error {
  constructor(message: string) {
    super(message, 422, "validation_error");
    this.name = "ValidationError";
  }
}

export function parseApiError(status: number, body: any): Rec0Error {
  const detail = body?.detail ?? {};
  const message = detail?.message || body?.message || `HTTP ${status}`;
  const code = detail?.error || body?.error || "";

  if (status === 401) return new AuthError(message);
  if (status === 404) return new NotFoundError(message);
  if (status === 429) {
    const retryAfter = Number(detail?.retry_after_seconds ?? 60);
    return new RateLimitError(message, Number.isFinite(retryAfter) ? retryAfter : 60);
  }
  if (status >= 500) return new ServerError(message, status);
  return new Rec0Error(message, status, code);
}
