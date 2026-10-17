import { describe, expect, test } from "bun:test";
import { buildPlayableCardImagePrompt } from "../buildPlayableCardImagePrompt";

describe("buildPlayableCardImagePrompt", () => {
  test("asks for watercolor art with no rendered text", () => {
    const prompt = buildPlayableCardImagePrompt({
      name: "Korr's First Bond",
      scene: "A climber beside a condensing Coreborn.",
    });

    expect(prompt).toContain("Watercolor on paper");
    expect(prompt).toContain("No letters, numbers, card frame");
    expect(prompt).toContain("Korr's First Bond");
    expect(prompt).toContain("A climber beside a condensing Coreborn.");
  });
});
