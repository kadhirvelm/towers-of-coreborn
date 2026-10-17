/**
 * Extracts a readable message from the `error` value on a Mastra `tool-error`
 * stream chunk. Mastra wraps the thrown exception in a `MastraError` whose
 * `cause` holds the original error, so the wrapper message is skipped in favor
 * of the cause when one is present.
 * @param error - The raw `payload.error` from a `tool-error` chunk
 * @returns The most specific human-readable message available
 */
export function formatToolErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    if (cause !== undefined && cause !== null) {
      return formatToolErrorMessage(cause);
    }
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message !== "") {
      return message;
    }
  }

  return String(error);
}
