import { describe, expect, test } from "bun:test";
import { resolveOpenAIImageSize } from "../openAIImageSize";

describe("resolveOpenAIImageSize", () => {
  test("defaults to a square 1K image", () => {
    expect(resolveOpenAIImageSize()).toBe("1024x1024");
  });

  test("keeps the card-character portrait at 3:4", () => {
    expect(
      resolveOpenAIImageSize({ aspectRatio: "3:4", imageSize: "1K" }),
    ).toBe("768x1024");
    expect(
      resolveOpenAIImageSize({ aspectRatio: "3:4", imageSize: "2K" }),
    ).toBe("1536x2048");
  });

  test("covers the other shared aspect ratios", () => {
    expect(
      resolveOpenAIImageSize({ aspectRatio: "4:3", imageSize: "1K" }),
    ).toBe("1024x768");
    expect(
      resolveOpenAIImageSize({ aspectRatio: "16:9", imageSize: "2K" }),
    ).toBe("2048x1152");
    expect(
      resolveOpenAIImageSize({ aspectRatio: "9:16", imageSize: "1K" }),
    ).toBe("720x1280");
    expect(
      resolveOpenAIImageSize({ aspectRatio: "1:1", imageSize: "2K" }),
    ).toBe("2048x2048");
  });
});
