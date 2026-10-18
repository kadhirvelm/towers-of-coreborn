import type {
  PlayableCardEffect,
  PlayableCardRules,
} from "@towers-of-coreborn/api";

/**
 * Hardcoded battle used to check generated art in Phaser.
 *
 * Paste a workshop URL, or a `/static/...` path. Paths are loaded from the
 * backend (`NEXT_PUBLIC_API_CLIENT_URL`, `https://localhost:8080` locally).
 * Leave a string empty to keep the colored stand-in.
 *
 * Player and enemy portraits (level 1 is weakest, level 4 is strongest):
 * `/static/card-characters/<setId>/level-1.webp`
 *
 * Card illustration:
 * `/static/playable-cards/<cardId>/card.webp`
 *
 * Card rules. When `manifest.json` loads, it replaces `rules`.
 * The scene reads `name`, `aetherCost`, and `effects`
 * (`kind`, `amount`, `text`) from that file:
 * `/static/playable-cards/<cardId>/manifest.json`
 *
 * Hit points, the player's Aether, and the enemy's attack are set below.
 * Character portraits do not carry gameplay numbers.
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

/** The player, including the energy they can spend on cards. */
export interface BattlePlayerLoadout extends BattleActorLoadout {
  /** Aether available at the start. Playing a card subtracts its cost. */
  aether: number;
}

/** The enemy, including the damage it deals on its own attack. */
export interface BattleEnemyLoadout extends BattleActorLoadout {
  /** Damage this enemy deals when it attacks. Playing a card does not apply it. */
  attack: number;
}

/** One card in the opening hand or the deck. */
export interface BattleCardLoadout {
  /** Stable id used for art, the manifest, and play resolution. */
  id: string;
  /**
   * Illustration for this card.
   * Empty keeps the blank paper card.
   */
  imageUrl: string;
  /**
   * JSON rules for this card.
   * Empty keeps `rules`.
   */
  manifestUrl: string;
  /** Rules used until a manifest replaces them. */
  rules: PlayableCardRules;
}

/** Everything the battle scene loads before it paints. */
export interface BattleLoadout {
  /** Five cards, which is the fixed opening-hand size. */
  cards: BattleCardLoadout[];
  /** Cards draw effects pull, in order. */
  deck: BattleCardLoadout[];
  enemy: BattleEnemyLoadout;
  player: BattlePlayerLoadout;
}

/**
 * Builds one loadout card with a single effect and no art.
 * @param id - Stable card id
 * @param name - Name drawn on the card
 * @param aetherCost - Energy spent to play it
 * @param effect - The effect the battle resolves
 * @returns A card that keeps its paper stand-in
 */
function battleCard(
  id: string,
  name: string,
  aetherCost: number,
  effect: PlayableCardEffect,
): BattleCardLoadout {
  return {
    id,
    imageUrl: "",
    manifestUrl: "",
    rules: { aetherCost, effects: [effect], name },
  };
}

/** Edit the URLs in this object, then reload the game view. */
export const BATTLE_LOADOUT: BattleLoadout = {
  cards: [
    battleCard("strike", "Strike", 1, {
      amount: 6,
      kind: "attack",
      text: "Deal 6 damage to the enemy.",
    }),
    battleCard("guard", "Guard", 1, {
      amount: 8,
      kind: "defend",
      text: "Gain 8 block.",
    }),
    battleCard("sever", "Sever", 2, {
      amount: 12,
      kind: "attack",
      text: "Deal 12 damage to the enemy.",
    }),
    battleCard("draw", "Draw", 1, {
      amount: 2,
      kind: "draw",
      text: "Draw 2 cards.",
    }),
    battleCard("ward", "Ward", 1, {
      amount: 5,
      kind: "defend",
      text: "Gain 5 block.",
    }),
  ],
  deck: [
    battleCard("strike-2", "Strike", 1, {
      amount: 6,
      kind: "attack",
      text: "Deal 6 damage to the enemy.",
    }),
    battleCard("guard-2", "Guard", 1, {
      amount: 5,
      kind: "defend",
      text: "Gain 5 block.",
    }),
  ],
  enemy: {
    attack: 7,
    hitPoints: 28,
    imageUrl: "",
    maxHitPoints: 28,
    name: "Enemy",
  },
  player: {
    aether: 3,
    hitPoints: 40,
    imageUrl: "",
    maxHitPoints: 40,
    name: "Player",
  },
};
