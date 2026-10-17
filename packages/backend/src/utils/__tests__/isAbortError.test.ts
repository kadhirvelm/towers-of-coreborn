import { describe, expect, test } from "bun:test";
import { isAbortError } from "../isAbortError";

describe("isAbortError", () => {
  test("recognizes abort errors and generation cancellation", () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    const cancelled = new Error("Generation stopped.");
    cancelled.name = "GenerationCancelledException";

    expect(isAbortError(abortError)).toBe(true);
    expect(isAbortError(cancelled)).toBe(true);
    expect(isAbortError(new Error("model down"))).toBe(false);
    expect(isAbortError("aborted")).toBe(false);
  });
});
