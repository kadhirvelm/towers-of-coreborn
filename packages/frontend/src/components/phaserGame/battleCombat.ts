import type {
  PlayableCardEffect,
  PlayableCardRules,
} from "@towers-of-coreborn/api";
import { cardImageKey } from "./battleAssetRequests";
import type { BattleCardLoadout } from "./battleLoadout";

/** Cards in hand at once. Matches the combat design's fixed hand. */
export const BATTLE_HAND_SIZE = 5;

/** One card the battle can play. Art is optional; rules always come from the API. */
export interface BattleCard {
  id: string;
  /** Phaser texture key for this card's illustration. */
  imageKey: string;
  rules: PlayableCardRules;
}

/** Hit points and block for the player or the enemy. */
export interface BattleCombatant {
  block: number;
  hitPoints: number;
  maxHitPoints: number;
}

/**
 * A battle in progress.
 * There is no turn cycle: Aether is not refreshed, and block stays until damage spends it.
 */
export interface BattleCombatState {
  /** Energy left to spend. The combat design calls this resource Aether. */
  aether: number;
  deck: BattleCard[];
  discard: BattleCard[];
  enemy: BattleCombatant;
  /** Damage the enemy would deal on its own attack. Card plays do not apply it. */
  enemyAttack: number;
  hand: BattleCard[];
  player: BattleCombatant;
}

/** Numbers a resolved card changed, used to show what the play did. */
export interface PlayedCardConsequences {
  aetherGained: number;
  attackDamage: number;
  blockGained: number;
  /** Incoming damage a block stopped. Card plays do not deal this to the player. */
  blocked: number;
  drawn: number;
  playerDamage: number;
}

export type PlayBattleCardResult =
  | ({
      ok: true;
      state: BattleCombatState;
    } & PlayedCardConsequences)
  | {
      ok: false;
      reason: "battle-over" | "not-enough-aether" | "unknown-card";
    };

interface EffectApplication {
  aetherGained: number;
  attackDamage: number;
  blockGained: number;
  drawn: number;
  state: BattleCombatState;
}

/**
 * Builds the opening battle from the loadout's energy, health, and cards.
 * @param input - Starting pools and the cards already split into hand and deck
 * @returns Combat state before any card has been played
 */
export function createBattleCombatState(input: {
  aether: number;
  deck: BattleCard[];
  enemyAttack: number;
  enemyHitPoints: number;
  enemyMaxHitPoints: number;
  hand: BattleCard[];
  playerHitPoints: number;
  playerMaxHitPoints: number;
}): BattleCombatState {
  return {
    aether: input.aether,
    deck: input.deck,
    discard: [],
    enemy: {
      block: 0,
      hitPoints: input.enemyHitPoints,
      maxHitPoints: input.enemyMaxHitPoints,
    },
    enemyAttack: input.enemyAttack,
    hand: input.hand,
    player: {
      block: 0,
      hitPoints: input.playerHitPoints,
      maxHitPoints: input.playerMaxHitPoints,
    },
  };
}

/**
 * Turns a loadout card into a battle card.
 * A parsed manifest replaces the inline rules. The id and art stay put.
 * @param card - Hand or deck entry from `battleLoadout.ts`
 * @param manifest - Rules read from `manifest.json`, when that file loaded
 * @returns The card the battle can play
 */
export function toBattleCard(
  card: BattleCardLoadout,
  manifest?: PlayableCardRules,
): BattleCard {
  return {
    id: card.id,
    imageKey: cardImageKey(card.id),
    rules: manifest ?? card.rules,
  };
}

/**
 * @param state - Current battle
 * @returns Victory when the enemy is down, defeat when the player is
 */
export function battleOutcome(
  state: BattleCombatState,
): "victory" | "defeat" | undefined {
  if (state.enemy.hitPoints <= 0) {
    return "victory";
  }
  if (state.player.hitPoints <= 0) {
    return "defeat";
  }
  return undefined;
}

/**
 * Plays one card from the hand.
 * The card's Aether cost is spent first. Attack damages the enemy only.
 * Defend adds block, and draw takes cards from the deck up to the hand size.
 * Aether effects add energy. Combo is left unresolved until turns exist.
 * Playing a card does not strike the player back.
 * @param state - Battle before the play
 * @param cardId - Id of a card currently in hand
 * @returns The next state and what changed, or why the card was not played
 */
export function playBattleCard(
  state: BattleCombatState,
  cardId: string,
): PlayBattleCardResult {
  if (battleOutcome(state) !== undefined) {
    return { ok: false, reason: "battle-over" };
  }

  const card = state.hand.find((entry) => entry.id === cardId);
  if (card === undefined) {
    return { ok: false, reason: "unknown-card" };
  }
  if (state.aether < card.rules.aetherCost) {
    return { ok: false, reason: "not-enough-aether" };
  }

  let next = spendCard(state, card);
  const consequences = emptyConsequences();
  for (const effect of card.rules.effects) {
    const applied = applyEffect(next, effect);
    next = applied.state;
    consequences.aetherGained += applied.aetherGained;
    consequences.attackDamage += applied.attackDamage;
    consequences.blockGained += applied.blockGained;
    consequences.drawn += applied.drawn;
  }

  return { ok: true, state: next, ...consequences };
}

/**
 * Pays the cost and moves the card from the hand to the discard.
 * @param state - Battle before the play
 * @param card - Card being played
 * @returns State with the cost paid and the card out of hand
 */
function spendCard(
  state: BattleCombatState,
  card: BattleCard,
): BattleCombatState {
  return {
    ...state,
    aether: state.aether - card.rules.aetherCost,
    deck: [...state.deck],
    discard: [...state.discard, card],
    enemy: { ...state.enemy },
    hand: state.hand.filter((entry) => entry.id !== card.id),
    player: { ...state.player },
  };
}

/**
 * Resolves one effect.
 * Combo is ignored: it needs a turn's played-card history, which this battle does not track.
 * @param state - Battle after the cost was paid and after earlier effects
 * @param effect - The next effect on the card
 * @returns The updated battle and the amounts this effect contributed
 */
function applyEffect(
  state: BattleCombatState,
  effect: PlayableCardEffect,
): EffectApplication {
  const applied = { ...emptyConsequences(), state };
  if (effect.kind === "attack") {
    const hit = applyDamage(state.enemy, effect.amount);
    applied.attackDamage = hit.dealt;
    applied.state = { ...state, enemy: hit.combatant };
    return applied;
  }
  if (effect.kind === "defend") {
    applied.blockGained = effect.amount;
    applied.state = {
      ...state,
      player: { ...state.player, block: state.player.block + effect.amount },
    };
    return applied;
  }
  if (effect.kind === "draw") {
    const room = BATTLE_HAND_SIZE - state.hand.length;
    const count = Math.max(0, Math.min(effect.amount, room, state.deck.length));
    applied.drawn = count;
    applied.state = {
      ...state,
      deck: state.deck.slice(count),
      hand: [...state.hand, ...state.deck.slice(0, count)],
    };
    return applied;
  }
  if (effect.kind === "aether") {
    applied.aetherGained = effect.amount;
    applied.state = { ...state, aether: state.aether + effect.amount };
    return applied;
  }
  return applied;
}

/**
 * Spends block first, then hit points. Neither falls below zero.
 * @param combatant - The fighter being hit
 * @param amount - Incoming damage before block
 * @returns The fighter afterward, plus how much was blocked and how much got through
 */
function applyDamage(
  combatant: BattleCombatant,
  amount: number,
): { blocked: number; combatant: BattleCombatant; dealt: number } {
  const incoming = Math.max(0, amount);
  const blocked = Math.min(combatant.block, incoming);
  const dealt = Math.min(combatant.hitPoints, incoming - blocked);
  return {
    blocked,
    combatant: {
      ...combatant,
      block: combatant.block - blocked,
      hitPoints: combatant.hitPoints - dealt,
    },
    dealt,
  };
}

/**
 * @returns Consequence counters set to zero
 */
function emptyConsequences(): PlayedCardConsequences {
  return {
    aetherGained: 0,
    attackDamage: 0,
    blocked: 0,
    blockGained: 0,
    drawn: 0,
    playerDamage: 0,
  };
}
