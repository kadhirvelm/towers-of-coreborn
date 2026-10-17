import { describe, expect, test } from "bun:test";
import { BadRequestException } from "@nestjs/common";
import { requireGenerationPrompt } from "../requireGenerationPrompt";

describe("requireGenerationPrompt", () => {
  test("returns the trimmed prompt", () => {
    expect(requireGenerationPrompt("  a knight  ", "required")).toBe(
      "a knight",
    );
  });

  test("rejects a blank prompt", () => {
    const blank = catchError(() =>
      requireGenerationPrompt("   ", "Describe the asset."),
    );
    const missing = catchError(() =>
      requireGenerationPrompt(undefined, "Describe the asset."),
    );

    expect(blank instanceof BadRequestException).toBe(true);
    expect(missing instanceof Error ? missing.message : "").toBe(
      "Describe the asset.",
    );
  });
});

/**
 * @param run - Call that is expected to throw
 * @returns The thrown value
 */
function catchError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}
