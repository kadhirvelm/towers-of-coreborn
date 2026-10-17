import type { ServiceDefinition } from "../../genericTypes/service";
import {
  ASSET_CLASS_ENDPOINTS,
  type AssetClassServiceApi,
} from "./assetClassService";

/** A playable card's rules category, matching the combat toolkit. */
export type PlayableCardKind =
  | "attack"
  | "defend"
  | "draw"
  | "aether"
  | "combo";

/** A non-combo card a combo effect can chain from. */
export type PlayableCardChainKind = Exclude<PlayableCardKind, "combo">;

/**
 * One rules line on a playable card.
 * Status effects are not a kind: the combat design keeps them out of scope.
 */
export interface PlayableCardEffect {
  /** Damage, block, cards drawn, Aether gained, or the amplified combo amount */
  amount: number;
  /** Set only when `kind` is `combo` */
  chainsFrom?: PlayableCardChainKind;
  kind: PlayableCardKind;
  /** Player-facing rules text */
  text: string;
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
export interface PlayableCardAsset {
  /** Aether spent to play the card */
  aetherCost: number;
  cardId: string;
  createdAt: string;
  /** Flavor text written from Lore passages */
  description: string;
  effects: PlayableCardEffect[];
  /** File name inside the card directory */
  imageFileName: string;
  /** Absolute URL clients can use as an image source */
  imageUrl: string;
  /** The card's primary effect, which is the first effect */
  kind: PlayableCardKind;
  loreSources: PlayableCardLoreSource[];
  name: string;
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
