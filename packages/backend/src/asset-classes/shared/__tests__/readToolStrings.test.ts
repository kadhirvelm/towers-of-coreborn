import { describe, expect, test } from "bun:test";
import { InternalServerErrorException } from "@nestjs/common";
import { readToolStrings } from "../readToolStrings";

const FAILURE = "the tool returned an unexpected result shape.";

describe("readToolStrings", () => {
  test("returns the requested non-empty strings", () => {
    const parsed = readToolStrings(
      { fileName: "a.png", ignored: 1, publicPath: "/static/a.png" },
      ["fileName", "publicPath"],
      FAILURE,
    );

    expect(parsed.fileName).toBe("a.png");
    expect(parsed.publicPath).toBe("/static/a.png");
  });

  test("rejects a missing field, a blank field, and a non-object", () => {
    const missingField = catchError(() =>
      readToolStrings(
        { fileName: "a.png" },
        ["fileName", "publicPath"],
        FAILURE,
      ),
    );
    const blank = catchError(() =>
      readToolStrings({ setId: "  " }, ["setId"], FAILURE),
    );
    const notAnObject = catchError(() =>
      readToolStrings(null, ["setId"], FAILURE),
    );

    expect(missingField instanceof InternalServerErrorException).toBe(true);
    expect(blank instanceof Error ? blank.message : "").toBe(FAILURE);
    expect(notAnObject instanceof Error ? notAnObject.message : "").toBe(
      FAILURE,
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
