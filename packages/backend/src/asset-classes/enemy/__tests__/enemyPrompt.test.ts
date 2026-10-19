import { describe, expect, test } from "bun:test";
import { ENEMY_AGENT_INSTRUCTIONS, enemyPortraitRules } from "../enemyPrompt";

describe("enemy portrait direction", () => {
  test("locks enemies to the left-facing battle orientation", () => {
    const rules = enemyPortraitRules();

    expect(rules).toContain("LEFT EDGE OF THE IMAGE");
    expect(rules).toContain("nose or muzzle");
    expect(rules).toContain("back and tail extend toward the right");
    expect(rules).toContain("Never mirror it");
    expect(ENEMY_AGENT_INSTRUCTIONS).toContain(rules);
    expect(ENEMY_AGENT_INSTRUCTIONS).toContain(
      "Treat this screen direction as the highest-priority composition rule",
    );
  });

  test("requires a repeating attack and defend cycle", () => {
    expect(ENEMY_AGENT_INSTRUCTIONS).toContain("attack cycle");
    expect(ENEMY_AGENT_INSTRUCTIONS).toContain(
      "performs them in array order, then starts again at the first action",
    );
    expect(ENEMY_AGENT_INSTRUCTIONS).toContain("Include 2 to 4 actions");
    expect(ENEMY_AGENT_INSTRUCTIONS).toContain(
      "kind is attack or defend, the same playable-card kinds",
    );
    expect(ENEMY_AGENT_INSTRUCTIONS).toContain(
      "Do not use draw, aether, combo, or status effects.",
    );
    expect(ENEMY_AGENT_INSTRUCTIONS).toContain("Attack amounts are 4 to 16");
    expect(ENEMY_AGENT_INSTRUCTIONS).toContain("Defend amounts are 4 to 16");
  });
});
