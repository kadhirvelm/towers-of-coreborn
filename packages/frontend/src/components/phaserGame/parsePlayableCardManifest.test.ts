import { describe, expect, test } from "bun:test";
import {
  formatBattleCardRules,
  parsePlayableCardManifest,
} from "./parsePlayableCardManifest";

const MANIFEST = {
  aetherCost: 1,
  cardId: "floor-4-bond",
  createdAt: "2026-06-01T00:00:00.000Z",
  description: "A floor 4 bond.",
  effects: [
    { amount: 6, kind: "attack", text: "Deal 6 damage to one enemy." },
    {
      amount: 2,
      chainsFrom: "attack",
      kind: "combo",
      text: "If you played an attack, deal 2 more.",
    },
  ],
  imageFileName: "card.webp",
  kind: "attack",
  loreSources: [
    {
      documentId: "ff1b04a0-b440-4746-9a1a-cd25fba0c32b",
      excerpt: "Tamsin Korr bonded a Coreborn on floor 4.",
      title: "Lore",
      url: "https://app.productnow.ai/lore",
    },
  ],
  name: "Floor 4 Bond",
  prompt: "a bond card",
};

describe("parsePlayableCardManifest", () => {
  test("keeps the name, cost, and effect lines from a stored manifest", () => {
    expect(parsePlayableCardManifest(MANIFEST)).toEqual({
      aetherCost: 1,
      effects: [
        { amount: 6, kind: "attack", text: "Deal 6 damage to one enemy." },
        {
          amount: 2,
          chainsFrom: "attack",
          kind: "combo",
          text: "If you played an attack, deal 2 more.",
        },
      ],
      name: "Floor 4 Bond",
    });
  });

  test("builds effect text from kind and amount when text is omitted", () => {
    expect(
      parsePlayableCardManifest({
        aetherCost: 0,
        effects: [{ amount: 3, kind: "defend" }],
        name: "Ward",
      }),
    ).toEqual({
      aetherCost: 0,
      effects: [{ amount: 3, kind: "defend", text: "defend 3" }],
      name: "Ward",
    });
  });

  test("rejects a manifest without a name, a cost, or a valid effect", () => {
    expect(parsePlayableCardManifest(null)).toBeUndefined();
    expect(
      parsePlayableCardManifest({ effects: [], name: " " }),
    ).toBeUndefined();
    expect(
      parsePlayableCardManifest({
        aetherCost: 1.5,
        effects: [],
        name: "Strike",
      }),
    ).toBeUndefined();
    expect(
      parsePlayableCardManifest({
        aetherCost: 1,
        effects: [{ amount: 4, text: "Deal 4." }],
        name: "Strike",
      }),
    ).toBeUndefined();
    expect(
      parsePlayableCardManifest({
        aetherCost: 1,
        effects: [{ amount: 4, kind: "poison", text: "Apply poison." }],
        name: "Strike",
      }),
    ).toBeUndefined();
  });
});

describe("formatBattleCardRules", () => {
  test("puts the cost on the title line and each effect on its own line", () => {
    const rules = parsePlayableCardManifest(MANIFEST);
    expect(rules).toBeDefined();
    if (!rules) {
      return;
    }

    expect(formatBattleCardRules(rules)).toBe(
      "Floor 4 Bond · 1 Aether\nDeal 6 damage to one enemy.\nIf you played an attack, deal 2 more.",
    );
  });

  test("pluralizes costs other than 1", () => {
    expect(
      formatBattleCardRules({
        aetherCost: 2,
        effects: [],
        name: "Channel",
      }),
    ).toBe("Channel · 2 Aether");
  });
});
