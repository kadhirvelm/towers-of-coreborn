import type { ServiceDefinition } from "../../genericTypes/service";
import {
  ASSET_CLASS_ENDPOINTS,
  type AssetClassServiceApi,
} from "./assetClassService";

/** Power stage from 1 (weakest) to 4 (strongest). */
export type CardCharacterLevelNumber = 1 | 2 | 3 | 4;

/**
 * One power stage inside a stored card character.
 */
export interface CardCharacterLevelAsset {
  /** How this stage should look, as planned for image generation */
  description: string;
  /** File name inside the character set directory, e.g. `level-1.webp` */
  fileName: string;
  level: CardCharacterLevelNumber;
  /** Short name for this power stage */
  title: string;
  /** Absolute URL clients can use as an image source */
  url: string;
}

/**
 * Four portraits of one character, saved together under `/static/card-characters/{setId}`.
 */
export interface CardCharacterSetAsset {
  createdAt: string;
  /** Ordered from weakest to strongest */
  levels: CardCharacterLevelAsset[];
  /** The prompt the user submitted */
  prompt: string;
  setId: string;
  /** Visual theme shared by every level */
  theme: string;
}

export interface ListCardCharactersResponse {
  /** Newest first */
  sets: CardCharacterSetAsset[];
}

/**
 * Card characters: one prompt becomes four facing-viewer portraits, weakest to strongest.
 */
export type CardCharacterServiceApi = AssetClassServiceApi<
  CardCharacterSetAsset,
  ListCardCharactersResponse
>;

export const CardCharacterServiceDefinition: ServiceDefinition<CardCharacterServiceApi> =
  {
    controller: "card-characters",
    endpoints: ASSET_CLASS_ENDPOINTS,
  };
