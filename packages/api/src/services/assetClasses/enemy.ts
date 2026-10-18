import type { ServiceDefinition } from "../../genericTypes/service";
import {
  ASSET_CLASS_ENDPOINTS,
  type AssetClassServiceApi,
} from "./assetClassService";

/**
 * Actions an enemy can take during its attack cycle.
 * These are the playable-card kinds an enemy performs: attack deals damage
 * to the player, and defend gains block. Draw, aether, and combo stay on cards.
 */
export const ENEMY_ACTION_KINDS = ["attack", "defend"] as const;

/** One playable-card kind an enemy can perform. */
export type EnemyActionKind = (typeof ENEMY_ACTION_KINDS)[number];

/**
 * One step in an enemy's attack cycle.
 * The amount uses the same bounds as that kind on a playable card.
 */
export interface EnemyAction {
  /**
   * Attack deals this much damage to the player.
   * Defend gains this much block.
   */
  amount: number;
  kind: EnemyActionKind;
  /** Player-facing rules text */
  text: string;
}

/**
 * @param value - Candidate action kind
 * @returns Whether the value is attack or defend
 */
export function isEnemyActionKind(value: unknown): value is EnemyActionKind {
  return ENEMY_ACTION_KINDS.some((kind) => kind === value);
}

/** One generated battle enemy, ready to stand on the right side of a fight. */
export interface EnemyAsset {
  /** When this enemy was generated. */
  createdAt: string;
  /** What the creature looks like. */
  description: string;
  /** Stable folder id under `/static/enemies`. */
  id: string;
  /** Absolute URL clients can use as the enemy portrait. */
  imageUrl: string;
  /** Health the enemy starts with in battle. */
  maxHitPoints: number;
  /**
   * Actions the enemy takes in order. After the last action it returns
   * to the first and repeats. Empty for an enemy saved before cycles existed.
   */
  pattern: EnemyAction[];
  /** Original request from the user. */
  prompt: string;
  /** Short display name for the enemy. */
  title: string;
}

export interface ListEnemiesResponse {
  /** Newest enemies first. */
  enemies: EnemyAsset[];
}

/** Enemies: one prompt becomes one full-body portrait facing the player. */
export type EnemyServiceApi = AssetClassServiceApi<
  EnemyAsset,
  ListEnemiesResponse
>;

export const EnemyServiceDefinition: ServiceDefinition<EnemyServiceApi> = {
  controller: "enemies",
  endpoints: ASSET_CLASS_ENDPOINTS,
};
