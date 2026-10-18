/**
 * Shared constants for the four-level card character portraits.
 * Portraits are 3:4. The registered generate-image tool paints them.
 */

import type { ImageGenerationConfig } from "src/model/types/modelRequestTypes";

export const CARD_CHARACTER_LEVELS = [1, 2, 3, 4] as const;

export type CardCharacterLevelNumber = (typeof CARD_CHARACTER_LEVELS)[number];

/** Portrait ratio used for collectible-card character art. */
export const CARD_CHARACTER_IMAGE_CONFIG: ImageGenerationConfig = {
  aspectRatio: "3:4",
  imageSize: "1K",
};

/**
 * Pixel size every saved level is fitted onto, so all four levels and all
 * providers share one canvas. 3:4, matching {@link CARD_CHARACTER_IMAGE_CONFIG}.
 */
export const CARD_CHARACTER_CANVAS_PX = { height: 1024, width: 768 } as const;

/** Fill for canvas padding. Matches the white background the prompt asks for. */
export const CARD_CHARACTER_CANVAS_BACKGROUND = {
  alpha: 1,
  b: 255,
  g: 255,
  r: 255,
} as const;

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
  return `level-${level}.webp`;
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
