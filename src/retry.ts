import type { RetryOptions } from "./types.js";
import { NetworkError, RateLimitError, ServerError } from "./errors.js";

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export function isRetryable(error: unknown): boolean {
  if (error instanceof RateLimitError) return true;
  if (error instanceof ServerError) {
    return RETRYABLE_STATUS_CODES.has(error.status ?? 0);
  }
  return error instanceof NetworkError;
}

export function getDelay(
  attempt: number,
  options: Required<RetryOptions>,
  retryAfter?: number
): number {
  if (retryAfter && retryAfter > 0) {
    return retryAfter * 1000;
  }

  const baseDelay = options.initialDelay * Math.pow(options.exponentialBase, attempt);
  const cappedDelay = Math.min(baseDelay, options.maxDelay);

  if (!options.jitter) {
    return cappedDelay;
  }

  return Math.random() * cappedDelay;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Required<RetryOptions>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= options.maxRetries) {
        break;
      }

      if (!isRetryable(error)) {
        throw error;
      }

      const retryAfter = error instanceof RateLimitError ? error.retryAfter : undefined;
      const delayMs = getDelay(attempt, options, retryAfter);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export function resolveRetryOptions(partial?: RetryOptions): Required<RetryOptions> {
  return {
    maxRetries: partial?.maxRetries ?? 3,
    initialDelay: partial?.initialDelay ?? 500,
    maxDelay: partial?.maxDelay ?? 60_000,
    exponentialBase: partial?.exponentialBase ?? 2,
    jitter: partial?.jitter ?? true,
  };
}
