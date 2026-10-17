/**
 * Shared constants for the four-level card character portraits.
 * Image generation asks Gemini for a 3:4 portrait; sprite sheets stay 1:1.
 */

import type { ImageGenerationConfig } from "src/model/types/modelRequestTypes";

export const CARD_CHARACTER_LEVELS = [1, 2, 3, 4] as const;

export type CardCharacterLevelNumber = (typeof CARD_CHARACTER_LEVELS)[number];

export const CARD_CHARACTER_IMAGE_MODEL = "gemini-3-pro-image" as const;

/** Portrait ratio used for collectible-card character art. */
export const CARD_CHARACTER_IMAGE_CONFIG: ImageGenerationConfig = {
  aspectRatio: "3:4",
  imageSize: "1K",
};

/** Per-level attempts when the image model returns an unusable file. */
export const MAX_CARD_CHARACTER_LEVEL_ATTEMPTS = 2;

export const CARD_CHARACTER_MANIFEST_FILE_NAME = "manifest.json";

/**
 * @param value - Candidate level number from tool input or a manifest
 * @returns Whether the value is one of the four card-character stages
 */
export function isCardCharacterLevelNumber(
  value: unknown,
): value is CardCharacterLevelNumber {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/**
 * @param level - Power stage from 1 to 4
 * @returns File name stored inside the character set directory
 */
export function cardCharacterLevelFileName(
  level: CardCharacterLevelNumber,
): string {
  return `level-${level}.png`;
}

/**
 * Orders level records as 1, 2, 3, 4.
 * @param levels - Level records that should contain each stage once
 * @returns The four levels in ascending order, or `undefined` when a stage is missing or duplicated
 */
export function orderCardCharacterLevels<
  T extends { level: CardCharacterLevelNumber },
>(levels: T[]): T[] | undefined {
  const ordered: T[] = [];

  for (const levelNumber of CARD_CHARACTER_LEVELS) {
    const match = levels.find((level) => level.level === levelNumber);
    if (match === undefined) {
      return undefined;
    }
    ordered.push(match);
  }

  if (levels.length !== CARD_CHARACTER_LEVELS.length) {
    return undefined;
  }

  return ordered;
}
