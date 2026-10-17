/** biome-ignore-all lint/suspicious/noExplicitAny: this is a utility function for any types */

interface ConvertErrorOptions {
  /** When true, includes the stack trace for native Error objects. Defaults to false. */
  includeStack?: boolean;
}

/**
 * Converts an unknown error/exception to a human-readable string.
 * Handles Error objects, objects with message/property, and fallback serialization.
 * Edge cases:
 *   - Native Error (extracts stack/message)
 *   - NestJs HttpException (extracts response/message)
 *   - API ServiceError type (extracts message/code if present)
 *   - Plain objects with message property
 *   - Primitives (string, number, boolean)
 *   - Null and undefined
 *   - Non-serializable (circular) objects (provides fallback)
 * @param exception - The error or exception to convert
 * @param options - Optional settings (e.g. includeStack)
 * @returns {string} - A descriptive string representing the error
 */
export const convertErrorToString = (
  exception: unknown,
  options?: ConvertErrorOptions,
): string => {
  if (!exception) {
    return "Unknown error";
  }

  // Handle primitive types
  if (typeof exception === "string") return exception;
  if (typeof exception === "number" || typeof exception === "boolean") {
    return exception.toString();
  }

  // Handle native Error object
  if (exception instanceof Error) {
    if (options?.includeStack && exception.stack) return exception.stack;
    if (exception.message) return exception.message;
    return exception.toString();
  }

  // Handle NestJS HttpException or errors with "response"
  // (Some libraries/custom errors put the message inside exception.response)
  if (
    typeof exception === "object" &&
    exception !== null &&
    (exception as any).response
  ) {
    const resp = (exception as any).response;
    if (typeof resp === "string") return resp;
    if (typeof resp === "object" && resp !== null && "message" in resp) {
      // response.message can be string or array of strings
      const msg = (resp as any).message;
      if (typeof msg === "string") return msg;
      if (Array.isArray(msg)) return msg.join("; ");
    }
  }

  // Handle ServiceError with message
  if (
    typeof exception === "object" &&
    exception !== null &&
    "message" in exception
  ) {
    const msg = (exception as any).message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) return msg.join("; ");
  }

  // Handle ServiceError/code pattern (e.g., { code, message })
  if (
    typeof exception === "object" &&
    exception !== null &&
    "code" in exception
  ) {
    const code = (exception as any).code;
    const msg = (exception as any).message;
    if (msg && code) {
      return `[${code}] ${msg}`;
    }
    if (msg) return msg.toString();
  }

  // Fallback: Try to safely stringify
  try {
    return JSON.stringify(exception);
  } catch {
    // Handle circular structure or unstringifiable objects
    try {
      return String(exception);
    } catch {
      return "Unstringifiable error object";
    }
  }
};
