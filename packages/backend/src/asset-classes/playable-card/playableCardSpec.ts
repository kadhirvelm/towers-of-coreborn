import type {
  PlayableCardChainKind,
  PlayableCardKind,
} from "@towers-of-coreborn/api";
import type { ImageGenerationConfig } from "src/model/types/modelRequestTypes";

/**
 * ProductNow document "Lore" in the Card game thing folder.
 * Generation searches this document and ignores other search hits.
 */
export const LORE_DOCUMENT_ID = "ff1b04a0-b440-4746-9a1a-cd25fba0c32b";

/**
 * ProductNow folder that holds the Lore document and the Towers of Coreborn design doc.
 */
export const CARD_GAME_FOLDER_ID = "e12d636b-aaa5-4b8e-b8a9-9a5b3d840dba";

/** OpenAI model that writes the card from Lore search results. */
export const PLAYABLE_CARD_TEXT_MODEL = "gpt-5.4" as const;

/**
 * GPT Image 2.5 accepts the portrait sizes from `resolveOpenAIImageSize`.
 */
export const PLAYABLE_CARD_IMAGE_MODEL = "gpt-image-2.5-flare" as const;

/** Portrait ratio used for collectible-card art. */
export const PLAYABLE_CARD_IMAGE_CONFIG: ImageGenerationConfig = {
  aspectRatio: "3:4",
  imageSize: "1K",
};

export const PLAYABLE_CARD_IMAGE_FILE_NAME = "card.png";

export const PLAYABLE_CARD_MANIFEST_FILE_NAME = "manifest.json";

/** Research turns after the required first Lore search. */
export const MAX_PLAYABLE_CARD_RESEARCH_TURNS = 6;

/** Image attempts when the file is missing or too small. */
export const MAX_PLAYABLE_CARD_IMAGE_ATTEMPTS = 2;

export const PLAYABLE_CARD_AETHER_COST = { max: 4, min: 1 } as const;

export const PLAYABLE_CARD_EFFECT_AMOUNTS: Record<
  PlayableCardKind,
  { max: number; min: number }
> = {
  aether: { max: 3, min: 1 },
  attack: { max: 16, min: 4 },
  combo: { max: 20, min: 6 },
  defend: { max: 16, min: 4 },
  draw: { max: 2, min: 1 },
};

export const PLAYABLE_CARD_CHAIN_KINDS: readonly PlayableCardChainKind[] = [
  "attack",
  "defend",
  "draw",
  "aether",
];

/** Words that would smuggle a status effect into rules text. */
export const PLAYABLE_CARD_STATUS_WORDS = [
  "bleed",
  "buff",
  "burn",
  "debuff",
  "poison",
  "stun",
  "vulnerable",
] as const;

/**
 * @param value - Candidate rules category
 * @returns Whether the value is one of the five combat toolkit kinds
 */
export function isPlayableCardKind(value: unknown): value is PlayableCardKind {
  return (
    value === "attack" ||
    value === "defend" ||
    value === "draw" ||
    value === "aether" ||
    value === "combo"
  );
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
