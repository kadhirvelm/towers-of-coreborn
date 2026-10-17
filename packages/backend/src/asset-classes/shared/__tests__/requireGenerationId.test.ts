import { describe, expect, test } from "bun:test";
import { BadRequestException } from "@nestjs/common";
import { requireGenerationId } from "../requireGenerationId";

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

const GENERATION_ID = "4f1c0b2e-6a7d-4c8e-9f10-123456789abc";

describe("requireGenerationId", () => {
  test("accepts a UUID and rejects anything else", () => {
    expect(requireGenerationId(`  ${GENERATION_ID}  `)).toBe(GENERATION_ID);

    const blank = catchError(() => requireGenerationId(""));
    const malformed = catchError(() => requireGenerationId("not-a-uuid"));

    expect(blank instanceof BadRequestException).toBe(true);
    expect(malformed instanceof BadRequestException).toBe(true);
  });
});
