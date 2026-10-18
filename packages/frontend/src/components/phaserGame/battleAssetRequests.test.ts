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
            fallbackName: "Strike",
            imageUrl: "/static/playable-cards/strike/card.webp",
            manifestUrl: "/static/playable-cards/strike/manifest.json",
          },
          {
            fallbackName: "Guard",
            imageUrl: "",
            manifestUrl: "https://cdn.example/guard.json",
          },
        ],
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
        key: cardImageKey(0),
        kind: "image",
        url: "https://localhost:8080/static/playable-cards/strike/card.webp",
      },
      {
        key: cardManifestKey(0),
        kind: "json",
        url: "https://localhost:8080/static/playable-cards/strike/manifest.json",
      },
      {
        key: cardManifestKey(1),
        kind: "json",
        url: "https://cdn.example/guard.json",
      },
    ]);
  });
});
