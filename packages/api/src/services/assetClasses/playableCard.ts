import type { ServiceDefinition } from "../../genericTypes/service";
import {
  ASSET_CLASS_ENDPOINTS,
  type AssetClassServiceApi,
} from "./assetClassService";

/**
 * Rules categories a playable card can declare.
 * Attack, defend, and draw are resolved in battle. Aether adds energy.
 * Combo is stored for later turns and is not resolved yet.
 */
export const PLAYABLE_CARD_KINDS = [
  "attack",
  "defend",
  "draw",
  "aether",
  "combo",
] as const;

/** A playable card's rules category, matching the combat toolkit. */
export type PlayableCardKind = (typeof PLAYABLE_CARD_KINDS)[number];

/** Kinds a combo effect can chain from. Combo itself cannot start a chain. */
export const PLAYABLE_CARD_CHAIN_KINDS = [
  "attack",
  "defend",
  "draw",
  "aether",
] as const;

/** A non-combo card a combo effect can chain from. */
export type PlayableCardChainKind = (typeof PLAYABLE_CARD_CHAIN_KINDS)[number];

/**
 * One rules line on a playable card.
 * Status effects are not a kind: the combat design keeps them out of scope.
 */
export interface PlayableCardEffect {
  /**
   * Attack deals this much damage. Defend gains this much block.
   * Draw takes this many cards from the deck. Aether adds this much energy.
   * Combo is the amplified amount, resolved once turns exist.
   */
  amount: number;
  /** Set only when `kind` is `combo` */
  chainsFrom?: PlayableCardChainKind;
  kind: PlayableCardKind;
  /** Player-facing rules text */
  text: string;
}

/**
 * The rules a card plays with: its energy cost and effects.
 * Generated manifests and the battle both use this shape.
 */
export interface PlayableCardRules {
  /** Energy spent to play the card. The combat design calls this resource Aether. */
  aetherCost: number;
  effects: PlayableCardEffect[];
  name: string;
}

/**
 * @param value - Candidate rules category
 * @returns Whether the value is one of the combat toolkit kinds
 */
export function isPlayableCardKind(value: unknown): value is PlayableCardKind {
  return PLAYABLE_CARD_KINDS.some((kind) => kind === value);
}

/**
 * @param value - Candidate chain target
 * @returns Whether a combo effect can chain from this kind
 */
export function isPlayableCardChainKind(
  value: unknown,
): value is PlayableCardChainKind {
  return PLAYABLE_CARD_CHAIN_KINDS.some((kind) => kind === value);
}

/**
 * A passage the generator retrieved from the ProductNow Lore document.
 */
export interface PlayableCardLoreSource {
  documentId: string;
  excerpt: string;
  title: string;
  url: string;
}

/**
 * One stored playable card: illustration, lore description, and rules.
 */
export interface PlayableCardAsset extends PlayableCardRules {
  cardId: string;
  createdAt: string;
  /** Flavor text written from Lore passages */
  description: string;
  /** File name inside the card directory */
  imageFileName: string;
  /** Absolute URL clients can use as an image source */
  imageUrl: string;
  /** The card's primary effect, which is the first effect */
  kind: PlayableCardKind;
  loreSources: PlayableCardLoreSource[];
  /** The prompt the user submitted */
  prompt: string;
}

export interface ListPlayableCardsResponse {
  /** Newest first */
  cards: PlayableCardAsset[];
}

/**
 * Playable cards: one prompt becomes one card with art, lore text, and effects.
 */
export type PlayableCardServiceApi = AssetClassServiceApi<
  PlayableCardAsset,
  ListPlayableCardsResponse
>;

export const PlayableCardServiceDefinition: ServiceDefinition<PlayableCardServiceApi> =
  {
    controller: "playable-cards",
    endpoints: ASSET_CLASS_ENDPOINTS,
  };
