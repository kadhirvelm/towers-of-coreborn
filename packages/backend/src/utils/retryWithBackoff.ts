import { isAbortError } from "./isAbortError";

interface RetryWithBackoffOptions {
  attempts?: number;
  baseDelayMs?: number;
}

/**
 * Retries a transient async operation with a small exponential backoff.
 *
 * @param operation - Async operation to retry.
 * @param options - Retry count and initial delay override.
 * @returns The first successful operation result.
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryWithBackoffOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)),
      );
    }
  }

  throw lastError;
}
