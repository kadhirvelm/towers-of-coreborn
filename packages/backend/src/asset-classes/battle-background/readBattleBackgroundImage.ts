import { InternalServerErrorException } from "@nestjs/common";
import type { GeneratedImage } from "src/mastra/tools/generateImageTool.service";
import { z } from "zod";
import { BATTLE_BACKGROUND_IMAGE_CONFIG } from "./battleBackgroundSpec";

const MIN_DESCRIPTION_LENGTH = 20;

const battleBackgroundImageSchema = z.object({
  aspectRatio: z.literal(BATTLE_BACKGROUND_IMAGE_CONFIG.aspectRatio),
  imageSize: z.literal(BATTLE_BACKGROUND_IMAGE_CONFIG.imageSize),
  images: z.tuple([
    z.object({
      filePath: z.string().trim().min(1),
      name: z.string().trim().min(1).max(100),
      notes: z.string().trim().min(MIN_DESCRIPTION_LENGTH).max(800),
    }),
  ]),
});

/**
 * The one room painting returned by the generate-image tool.
 */
export interface BattleBackgroundImage {
  image: GeneratedImage;
}

const FAILURE_MESSAGE =
  "Battle background generation failed: generate-image must return one 16:9 2K image with a room title and a scene description of at least 20 characters.";

/**
 * Checks that a generate-image result is one wide battle-room painting.
 * @param rawResult - Value returned by the generate-image tool
 * @returns The painting's file, title, and scene description
 * @throws InternalServerErrorException when the result is not one 16:9 2K image
 */
export function readBattleBackgroundImage(
  rawResult: unknown,
): BattleBackgroundImage {
  const parsed = battleBackgroundImageSchema.safeParse(rawResult);
  if (!parsed.success) {
    throw new InternalServerErrorException(FAILURE_MESSAGE);
  }

  const image = parsed.data.images[0];
  return {
    image: {
      filePath: image.filePath,
      name: image.name,
      notes: image.notes,
    },
  };
}
