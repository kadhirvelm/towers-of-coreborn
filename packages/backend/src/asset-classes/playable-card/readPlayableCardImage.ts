import { InternalServerErrorException } from "@nestjs/common";
import type { GeneratedImage } from "src/mastra/tools/generateImageTool.service";
import { z } from "zod";
import { PLAYABLE_CARD_IMAGE_CONFIG } from "./playableCardSpec";

const playableCardImageSchema = z.object({
  aspectRatio: z.literal(PLAYABLE_CARD_IMAGE_CONFIG.aspectRatio),
  imageSize: z.literal(PLAYABLE_CARD_IMAGE_CONFIG.imageSize),
  images: z.tuple([
    z.object({
      filePath: z.string().trim().min(1),
      name: z.string(),
      notes: z.string(),
    }),
  ]),
});

const FAILURE_MESSAGE =
  "Playable card generation failed: generate-image must return one 3:4 1K portrait.";

/**
 * Checks that a generate-image result is one card portrait.
 * @param rawResult - Value returned by the generate-image tool
 * @returns The portrait file
 * @throws InternalServerErrorException when the result is not one 3:4 1K image
 */
export function readPlayableCardImage(rawResult: unknown): GeneratedImage {
  const parsed = playableCardImageSchema.safeParse(rawResult);
  if (!parsed.success) {
    throw new InternalServerErrorException(FAILURE_MESSAGE);
  }

  const image = parsed.data.images[0];
  return {
    filePath: image.filePath,
    name: image.name,
    notes: image.notes,
  };
}
