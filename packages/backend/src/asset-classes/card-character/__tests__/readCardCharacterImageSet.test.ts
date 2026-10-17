import { describe, expect, test } from "bun:test";
import { InternalServerErrorException } from "@nestjs/common";
import { readCardCharacterImageSet } from "../readCardCharacterImageSet";

const portrait = (level: number) => ({
  filePath: `/tmp/level-${level}.png`,
  name: `Stage ${level}`,
  notes: `What changes at stage ${level}.`,
});

const validSet = {
  aspectRatio: "3:4",
  imageSize: "1K",
  images: [portrait(1), portrait(2), portrait(3), portrait(4)],
  model: "gemini-3-pro-image",
  provider: "gemini",
  theme: "Brass clockwork and soot.",
  usedFirstImageAsReference: true,
};

describe("readCardCharacterImageSet", () => {
  test("returns the four portraits and the theme", () => {
    expect(readCardCharacterImageSet(validSet)).toEqual({
      images: validSet.images,
      theme: validSet.theme,
    });
  });

  test("rejects a set that did not reuse the first portrait", () => {
    const error = readFailure({
      ...validSet,
      usedFirstImageAsReference: false,
    });
    expect(error instanceof InternalServerErrorException).toBe(true);
    expect(error.message).toContain("generate-image");
  });
});

/**
 * @param raw - Tool payload that should fail the card-character check
 * @returns The thrown error
 */
function readFailure(raw: unknown): Error {
  try {
    readCardCharacterImageSet(raw);
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
  }
  throw new Error("expected readCardCharacterImageSet to throw");
}
