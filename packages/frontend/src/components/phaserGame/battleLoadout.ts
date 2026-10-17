/**
 * Hardcoded battle used to check generated art in Phaser.
 *
 * Paste a workshop URL, or a `/static/...` path. Paths are loaded from the
 * backend (`NEXT_PUBLIC_API_CLIENT_URL`, `https://localhost:8080` locally).
 * Leave a string empty to keep the colored stand-in.
 *
 * Player and enemy portraits (level 1 is weakest, level 4 is strongest):
 * `/static/card-characters/<setId>/level-1.png`
 *
 * Card illustration:
 * `/static/playable-cards/<cardId>/card.png`
 *
 * Card rules. The scene reads `name`, `aetherCost`, and `effects`
 * (`kind`, `amount`, `text`) from this file:
 * `/static/playable-cards/<cardId>/manifest.json`
 *
 * Hit points are set on the actors below. Character portraits do not
 * carry gameplay numbers.
 */
export interface BattleActorLoadout {
  /** Current hit points drawn on the health bar. */
  hitPoints: number;
  /**
   * Portrait to draw for this actor.
   * Empty keeps the colored circle.
   */
  imageUrl: string;
  /** Maximum hit points drawn on the health bar. */
  maxHitPoints: number;
  /** Name drawn under the portrait. */
  name: string;
}

/** One card in the opening hand, left to right. */
export interface BattleCardLoadout {
  /** Name drawn until `manifest.json` loads. */
  fallbackName: string;
  /**
   * Illustration for this card.
   * Empty keeps the blank paper card.
   */
  imageUrl: string;
  /**
   * JSON rules for this card.
   * Empty keeps `fallbackName` and hides effect lines.
   */
  manifestUrl: string;
}

/** Everything the battle scene loads before it paints. */
export interface BattleLoadout {
  /** Five cards, which is the fixed opening-hand size. */
  cards: BattleCardLoadout[];
  enemy: BattleActorLoadout;
  player: BattleActorLoadout;
}

/** Edit the URLs in this object, then reload the game view. */
export const BATTLE_LOADOUT: BattleLoadout = {
  cards: [
    { fallbackName: "Strike", imageUrl: "", manifestUrl: "" },
    { fallbackName: "Guard", imageUrl: "", manifestUrl: "" },
    { fallbackName: "Channel", imageUrl: "", manifestUrl: "" },
    { fallbackName: "Draw", imageUrl: "", manifestUrl: "" },
    { fallbackName: "Aether", imageUrl: "", manifestUrl: "" },
  ],
  enemy: {
    hitPoints: 28,
    imageUrl: "",
    maxHitPoints: 28,
    name: "Enemy",
  },
  player: {
    hitPoints: 40,
    imageUrl: "",
    maxHitPoints: 40,
    name: "Player",
  },
};
