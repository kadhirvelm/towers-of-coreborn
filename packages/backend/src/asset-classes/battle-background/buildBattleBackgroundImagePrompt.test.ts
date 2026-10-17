import { describe, expect, test } from "bun:test";
import { buildBattleBackgroundImagePrompt } from "./buildBattleBackgroundImagePrompt";

describe("buildBattleBackgroundImagePrompt", () => {
  test("applies the art direction and reserves combat UI space", () => {
    const prompt = buildBattleBackgroundImagePrompt({
      description: "A broken moon gate above a quiet jade garden.",
      title: "Moon Gate Terrace",
    });

    expect(prompt).toContain("wide 16:9");
    expect(prompt).toContain("Soft watercolor");
    expect(prompt).toContain("Chinese mythology");
    expect(prompt).toContain("left third");
    expect(prompt).toContain("right third");
    expect(prompt).toContain("bottom quarter");
    expect(prompt).toContain("No people, monsters, creatures");
  });

  test("includes failure context on a retry", () => {
    const prompt = buildBattleBackgroundImagePrompt({
      description: "An overgrown bell chamber.",
      previousError: "image was too small",
      title: "Silent Bell",
    });

    expect(prompt).toContain("Previous attempt failed: image was too small");
  });
});
