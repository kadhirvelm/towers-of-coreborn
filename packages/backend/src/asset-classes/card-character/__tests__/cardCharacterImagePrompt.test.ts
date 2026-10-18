import { describe, expect, test } from "bun:test";
import { buildCardCharacterImagePrompt } from "../cardCharacterImagePrompt";

const identity =
  "A lanky inventor with round brass goggles, a soot smudge, and a patched brown coat.";
const theme = "Brass clockwork, soot, and warm lamplight.";

describe("buildCardCharacterImagePrompt", () => {
  test("asks for a full-body watercolor figure that starts small", () => {
    const prompt = buildCardCharacterImagePrompt({
      hasReferenceImage: false,
      identity,
      level: {
        description: "Empty tool belt and hunched shoulders.",
        level: 1,
        title: "Workshop Apprentice",
      },
      theme,
    });

    expect(prompt).toContain("facing right");
    expect(prompt).toContain("Never facing left");
    expect(prompt).toContain("Full body from head to feet");
    expect(prompt).toContain("Soft watercolor on paper");
    expect(prompt).toContain("Pure white background");
    expect(prompt).toContain("small in the image");
    expect(prompt).toContain("about one third of the image height");
    expect(prompt).toContain(identity);
    expect(prompt).toContain(theme);
    expect(prompt).toContain("level 1 of 4");
    expect(prompt).toContain("Workshop Apprentice");
    expect(prompt).toContain("Weakest stage");
    expect(prompt).toContain("Later levels are generated from this portrait");
    expect(prompt).not.toContain("reference image of this exact character");
  });

  test("asks later levels to preserve the level 1 reference", () => {
    const prompt = buildCardCharacterImagePrompt({
      hasReferenceImage: true,
      identity,
      level: {
        description: "Fully spread filigree wings and a glowing mainspring.",
        level: 4,
        title: "Clockwork Sovereign",
      },
      previousError: "portrait was 8x8",
      theme,
    });

    expect(prompt).toContain("level 4 of 4");
    expect(prompt).toContain("Peak power");
    expect(prompt).toContain("about three fifths of the image height");
    expect(prompt).toContain("Fully equipped");
    expect(prompt).toContain(
      "A reference image of this exact character at level 1 is attached",
    );
    expect(prompt).toContain("portrait was 8x8");
  });
});
