import { describe, expect, test } from "bun:test";
import {
  cardImageKey,
  cardManifestKey,
  ENEMY_IMAGE_KEY,
  listBattleAssetRequests,
  PLAYER_IMAGE_KEY,
} from "./battleAssetRequests";
import { BATTLE_LOADOUT } from "./battleLoadout";

const ORIGIN = "https://localhost:8080";

describe("listBattleAssetRequests", () => {
  test("queues nothing while every URL is blank", () => {
    expect(listBattleAssetRequests(BATTLE_LOADOUT, ORIGIN)).toEqual([]);
  });

  test("queues the player, the enemy, and each card image with its manifest", () => {
    const requests = listBattleAssetRequests(
      {
        ...BATTLE_LOADOUT,
        cards: [
          {
            id: "strike",
            imageUrl: "/static/playable-cards/strike/card.webp",
            manifestUrl: "/static/playable-cards/strike/manifest.json",
            rules: BATTLE_LOADOUT.cards[0]?.rules ?? {
              aetherCost: 1,
              effects: [],
              name: "Strike",
            },
          },
          {
            id: "guard",
            imageUrl: "",
            manifestUrl: "https://cdn.example/guard.json",
            rules: BATTLE_LOADOUT.cards[1]?.rules ?? {
              aetherCost: 1,
              effects: [],
              name: "Guard",
            },
          },
        ],
        deck: [],
        enemy: {
          ...BATTLE_LOADOUT.enemy,
          imageUrl: "/static/card-characters/beast/level-2.webp",
        },
        player: {
          ...BATTLE_LOADOUT.player,
          imageUrl: "/static/card-characters/hero/level-1.webp",
        },
      },
      ORIGIN,
    );

    expect(requests).toEqual([
      {
        key: PLAYER_IMAGE_KEY,
        kind: "image",
        url: "https://localhost:8080/static/card-characters/hero/level-1.webp",
      },
      {
        key: ENEMY_IMAGE_KEY,
        kind: "image",
        url: "https://localhost:8080/static/card-characters/beast/level-2.webp",
      },
      {
        key: cardImageKey("strike"),
        kind: "image",
        url: "https://localhost:8080/static/playable-cards/strike/card.webp",
      },
      {
        key: cardManifestKey("strike"),
        kind: "json",
        url: "https://localhost:8080/static/playable-cards/strike/manifest.json",
      },
      {
        key: cardManifestKey("guard"),
        kind: "json",
        url: "https://cdn.example/guard.json",
      },
    ]);
  });
});
