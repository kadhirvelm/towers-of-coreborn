const ABORT_ERROR_NAMES = new Set([
  "AbortError",
  "GenerationCancelledException",
]);

/**
 * @param error - Failure from a model call, tool, or agent stream
 * @returns Whether the failure is an intentional abort
 */
export function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }
  return ABORT_ERROR_NAMES.has(String(error.name));
}
