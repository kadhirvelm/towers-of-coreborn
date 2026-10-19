import { describe, expect, test } from "bun:test";
import type { PlayableCardRules } from "@towers-of-coreborn/api";
import {
  type BattleCard,
  type BattleCombatState,
  battleOutcome,
  createBattleCombatState,
  playBattleCard,
} from "../battleCombat";

/**
 * @param id - Card id
 * @param rules - Energy cost and effects
 * @returns A card with no illustration
 */
function card(id: string, rules: PlayableCardRules): BattleCard {
  return { id, imageKey: `battle-card-image-${id}`, rules };
}

/**
 * @param hand - Opening hand
 * @param deck - Cards draw can pull
 * @param aether - Energy available before the play
 * @param enemyAttack - The enemy's own attack. Playing a card does not apply it.
 * @returns A fresh battle with 40 and 28 hit points
 */
function battle(
  hand: BattleCard[],
  deck: BattleCard[] = [],
  aether = 3,
  enemyAttack = 7,
): BattleCombatState {
  return createBattleCombatState({
    aether,
    deck,
    enemyAttack,
    enemyHitPoints: 28,
    enemyMaxHitPoints: 28,
    hand,
    playerHitPoints: 40,
    playerMaxHitPoints: 40,
  });
}

const strike = card("strike", {
  aetherCost: 1,
  effects: [{ amount: 6, kind: "attack", text: "Deal 6 damage." }],
  name: "Strike",
});

const guard = card("guard", {
  aetherCost: 1,
  effects: [{ amount: 8, kind: "defend", text: "Gain 8 block." }],
  name: "Guard",
});

describe("playBattleCard", () => {
  test("spends Aether and deals the attack to the enemy", () => {
    const result = playBattleCard(battle([strike]), strike.id);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.aether).toBe(2);
    expect(result.state.enemy.hitPoints).toBe(22);
    expect(result.attackDamage).toBe(6);
    expect(result.state.hand).toEqual([]);
    expect(result.state.discard).toEqual([strike]);
    expect(result.state.player.hitPoints).toBe(40);
    expect(result.playerDamage).toBe(0);
  });

  test("refuses a card the player cannot afford and leaves the battle unchanged", () => {
    const sever = card("sever", {
      aetherCost: 2,
      effects: [{ amount: 12, kind: "attack", text: "Deal 12 damage." }],
      name: "Sever",
    });
    const state = battle([sever], [], 1);
    const result = playBattleCard(state, sever.id);

    expect(result).toEqual({ ok: false, reason: "not-enough-aether" });
    expect(state.aether).toBe(1);
    expect(state.enemy.hitPoints).toBe(28);
    expect(state.hand).toEqual([sever]);
  });

  test("gains block without damaging the player", () => {
    const result = playBattleCard(battle([guard]), guard.id);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.blockGained).toBe(8);
    expect(result.playerDamage).toBe(0);
    expect(result.state.player.block).toBe(8);
    expect(result.state.player.hitPoints).toBe(40);
    expect(result.state.aether).toBe(2);
  });

  test("draws from the deck without going past the hand size", () => {
    const draw = card("draw", {
      aetherCost: 1,
      effects: [{ amount: 2, kind: "draw", text: "Draw 2 cards." }],
      name: "Draw",
    });
    const fillers = ["a", "b", "c", "d"].map((id) =>
      card(id, {
        aetherCost: 1,
        effects: [{ amount: 1, kind: "attack", text: "Deal 1 damage." }],
        name: id,
      }),
    );
    const deck = [strike, guard];
    const result = playBattleCard(battle([draw, ...fillers], deck), draw.id);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.drawn).toBe(1);
    expect(result.state.player.hitPoints).toBe(40);
    expect(result.state.hand.map((entry) => entry.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "strike",
    ]);
    expect(result.state.deck.map((entry) => entry.id)).toEqual(["guard"]);
  });

  test("a killing attack defeats the enemy and leaves the player unhurt", () => {
    const state = battle([strike]);
    state.enemy.hitPoints = 6;
    const result = playBattleCard(state, strike.id);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.enemy.hitPoints).toBe(0);
    expect(result.playerDamage).toBe(0);
    expect(result.state.player.hitPoints).toBe(40);
    expect(battleOutcome(result.state)).toBe("victory");
  });

  test("adds Aether from an Aether effect after the cost is paid", () => {
    const channel = card("channel", {
      aetherCost: 1,
      effects: [{ amount: 2, kind: "aether", text: "Gain 2 Aether." }],
      name: "Channel",
    });
    const result = playBattleCard(battle([channel]), channel.id);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.aetherGained).toBe(2);
    expect(result.state.aether).toBe(4);
  });

  test("leaves combo unresolved", () => {
    const combo = card("combo", {
      aetherCost: 1,
      effects: [
        {
          amount: 12,
          chainsFrom: "attack",
          kind: "combo",
          text: "After an attack, deal 12 more.",
        },
      ],
      name: "Follow Through",
    });
    const result = playBattleCard(battle([combo]), combo.id);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.attackDamage).toBe(0);
    expect(result.state.enemy.hitPoints).toBe(28);
  });
});
