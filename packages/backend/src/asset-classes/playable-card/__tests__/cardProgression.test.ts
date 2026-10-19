import { describe, expect, test } from "bun:test";
import {
  renderCardProgressionPrompt,
  strongerCardError,
} from "../cardProgression";

const previous = {
  aetherCost: 2,
  level: 2,
  previousEffects: [
    { amount: 6, kind: "attack" as const, text: "Deal 6 damage." },
  ],
};

describe("card progression", () => {
  test("requires the same cost and a higher amount", () => {
    expect(
      strongerCardError(
        {
          aetherCost: 3,
          effects: [{ amount: 8, kind: "attack", text: "Deal 8 damage." }],
        },
        previous,
      ),
    ).toContain("aether cost at 2");

    expect(
      strongerCardError(
        {
          aetherCost: 2,
          effects: [{ amount: 6, kind: "attack", text: "Deal 6 damage." }],
        },
        previous,
      ),
    ).toContain("above 6");

    expect(
      strongerCardError(
        {
          aetherCost: 2,
          effects: [{ amount: 8, kind: "attack", text: "Deal 8 damage." }],
        },
        previous,
      ),
    ).toBeUndefined();
  });

  test("keeps a capped amount instead of exceeding the toolkit", () => {
    const capped = {
      ...previous,
      previousEffects: [
        { amount: 2, kind: "draw" as const, text: "Draw 2 cards." },
      ],
    };

    expect(
      strongerCardError(
        {
          aetherCost: 2,
          effects: [{ amount: 2, kind: "draw", text: "Draw 2 cards." }],
        },
        capped,
      ),
    ).toBeUndefined();
  });

  test("describes the locked line for the model", () => {
    expect(renderCardProgressionPrompt(previous)).toContain("aether cost at 2");
    expect(renderCardProgressionPrompt(previous)).toContain("attack 6");
  });
});
