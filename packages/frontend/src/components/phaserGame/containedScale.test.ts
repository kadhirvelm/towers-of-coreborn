import { describe, expect, test } from "bun:test";
import { containedScale } from "./containedScale";

describe("containedScale", () => {
  test("fits a 3:4 portrait inside a square by its height", () => {
    expect(containedScale(768, 1024, 200, 200)).toBe(200 / 1024);
  });

  test("fits a wide texture by its width", () => {
    expect(containedScale(400, 100, 100, 200)).toBe(0.25);
  });

  test("returns 1 when the source size is unknown", () => {
    expect(containedScale(0, 10, 100, 100)).toBe(1);
  });
});
