import { describe, expect, test } from "bun:test";
import { enemyPatternSchema } from "../enemyPattern";

const attack = {
  amount: 6,
  kind: "attack",
  text: "Deal 6 damage to the player.",
};

const defend = {
  amount: 8,
  kind: "defend",
  text: "Gain 8 block.",
};

describe("enemyPatternSchema", () => {
  test("accepts a repeating attack and defend cycle", () => {
    const parsed = enemyPatternSchema.parse([attack, defend]);

    expect(parsed).toEqual([attack, defend]);
  });

  test("rejects a cycle shorter than two actions", () => {
    const parsed = enemyPatternSchema.safeParse([attack]);

    expect(parsed.success).toBe(false);
  });

  test("rejects a cycle longer than four actions", () => {
    const parsed = enemyPatternSchema.safeParse([
      attack,
      defend,
      attack,
      defend,
      attack,
    ]);

    expect(parsed.success).toBe(false);
  });

  test("rejects card kinds an enemy cannot take", () => {
    const parsed = enemyPatternSchema.safeParse([
      attack,
      { amount: 1, kind: "draw", text: "Draw 1 card from the deck." },
    ]);

    expect(parsed.success).toBe(false);
  });

  test("rejects amounts outside the playable card range", () => {
    const parsed = enemyPatternSchema.safeParse([
      { ...attack, amount: 3 },
      defend,
    ]);

    expect(parsed.success).toBe(false);
  });

  test("rejects status effects in the rules text", () => {
    const parsed = enemyPatternSchema.safeParse([
      { ...attack, text: "Deal 6 damage and apply poison." },
      defend,
    ]);

    expect(parsed.success).toBe(false);
  });
});
