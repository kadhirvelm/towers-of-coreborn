import { describe, expect, test } from "bun:test";
import { validatePlayableCardDraft } from "../validatePlayableCardDraft";

const validDraft = {
  aetherCost: 2,
  description:
    "Tamsin Korr weakened a newly condensed Coreborn on floor 4, and the bond held after the Trial window closed.",
  effects: [
    {
      amount: 8,
      chainsFrom: "",
      kind: "attack",
      text: "Deal 8 damage to one enemy.",
    },
  ],
  name: "Korr's First Bond",
  scene:
    "A climber kneeling beside a condensing spirit of vines on a stone floor.",
};

describe("validatePlayableCardDraft", () => {
  test("accepts an attack card and drops an empty chain target", () => {
    const result = validatePlayableCardDraft(validDraft);

    if ("error" in result) {
      throw new Error(result.error);
    }
    expect(result.draft.effects).toEqual([
      {
        amount: 8,
        kind: "attack",
        text: "Deal 8 damage to one enemy.",
      },
    ]);
  });

  test("accepts a combo that names the card it chains from", () => {
    const result = validatePlayableCardDraft({
      ...validDraft,
      effects: [
        {
          amount: 12,
          chainsFrom: "attack",
          kind: "combo",
          text: "After an Attack, deal 12 damage.",
        },
      ],
    });

    if ("error" in result) {
      throw new Error(result.error);
    }
    expect(result.draft.effects[0]?.chainsFrom).toBe("attack");
  });

  test("rejects status effects, duplicate kinds, and a combo with no chain", () => {
    expect(
      validatePlayableCardDraft({
        ...validDraft,
        effects: [
          {
            amount: 8,
            chainsFrom: "",
            kind: "attack",
            text: "Apply poison, then deal 8 damage.",
          },
        ],
      }),
    ).toEqual({
      error:
        'Effect text cannot include "poison". Status effects are out of scope.',
    });

    expect(
      validatePlayableCardDraft({
        ...validDraft,
        effects: [
          {
            amount: 6,
            chainsFrom: "",
            kind: "attack",
            text: "Deal 6 damage.",
          },
          {
            amount: 8,
            chainsFrom: "",
            kind: "attack",
            text: "Deal 8 damage.",
          },
        ],
      }),
    ).toEqual({ error: "A card can use attack only once." });

    expect(
      validatePlayableCardDraft({
        ...validDraft,
        effects: [
          {
            amount: 10,
            chainsFrom: "",
            kind: "combo",
            text: "Deal 10 extra damage.",
          },
        ],
      }),
    ).toEqual({
      error: "A combo effect must chain from attack, defend, draw, or aether.",
    });

    expect(
      validatePlayableCardDraft({
        ...validDraft,
        aetherCost: 0,
      }),
    ).toEqual({ error: "Aether cost must be from 1 to 4." });
  });
});
