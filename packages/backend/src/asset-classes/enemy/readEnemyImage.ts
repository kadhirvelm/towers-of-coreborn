import { InternalServerErrorException } from "@nestjs/common";
import type { GeneratedImage } from "src/mastra/tools/generateImageTool.service";
import { z } from "zod";
import { ENEMY_IMAGE_CONFIG } from "./enemySpec";

const MIN_DESCRIPTION_LENGTH = 20;

const enemyImageSchema = z.object({
  aspectRatio: z.literal(ENEMY_IMAGE_CONFIG.aspectRatio),
  imageSize: z.literal(ENEMY_IMAGE_CONFIG.imageSize),
  images: z.tuple([
    z.object({
      filePath: z.string().trim().min(1),
      name: z.string().trim().min(1).max(80),
      notes: z.string().trim().min(MIN_DESCRIPTION_LENGTH).max(800),
    }),
  ]),
});

/** The one portrait returned by the generate-image tool. */
export interface EnemyImage {
  image: GeneratedImage;
}

const FAILURE_MESSAGE =
  "Enemy generation failed: generate-image must return one 3:4 1K portrait with a creature name and a description of at least 20 characters.";

/**
 * Checks that a generate-image result is one enemy portrait.
 * @param rawResult - Value returned by the generate-image tool
 * @returns The portrait's file, name, and description
 * @throws InternalServerErrorException when the result is not one 3:4 1K portrait
 */
export function readEnemyImage(rawResult: unknown): EnemyImage {
  const parsed = enemyImageSchema.safeParse(rawResult);
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
