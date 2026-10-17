import { InternalServerErrorException } from "@nestjs/common";
import type { GeneratedImage } from "src/mastra/tools/generateImageTool.service";
import { z } from "zod";
import { CARD_CHARACTER_IMAGE_CONFIG } from "./cardCharacterSpec";

const portraitSchema = z.object({
  filePath: z.string().trim().min(1),
  name: z.string().trim().min(1),
  notes: z.string().trim().min(1),
});

const cardCharacterImageSetSchema = z.object({
  aspectRatio: z.literal("3:4"),
  imageSize: z.literal("1K"),
  images: z.tuple([
    portraitSchema,
    portraitSchema,
    portraitSchema,
    portraitSchema,
  ]),
  theme: z.string().trim().min(1),
  usedFirstImageAsReference: z.literal(true),
});

/**
 * Four portraits returned by the generate-image tool, weakest first.
 */
export interface CardCharacterImageSet {
  images: [GeneratedImage, GeneratedImage, GeneratedImage, GeneratedImage];
  theme: string;
}

/**
 * Checks that a generate-image result is a four-stage card-character set.
 * @param rawResult - Value returned by the generate-image tool
 * @returns The four portraits and their shared theme
 * @throws InternalServerErrorException when the result is not a 3:4 set of four referenced portraits
 */
export function readCardCharacterImageSet(
  rawResult: unknown,
): CardCharacterImageSet {
  const parsed = cardCharacterImageSetSchema.safeParse(rawResult);
  if (!parsed.success) {
    throw new InternalServerErrorException(
      "Card character generation failed: generate-image must return four 3:4 portraits that reuse the first image as the reference, with a theme, title, and description for each stage.",
    );
  }

  const aspectMatches =
    parsed.data.aspectRatio === CARD_CHARACTER_IMAGE_CONFIG.aspectRatio;
  const sizeMatches =
    parsed.data.imageSize === CARD_CHARACTER_IMAGE_CONFIG.imageSize;
  if (!aspectMatches || !sizeMatches) {
    throw new InternalServerErrorException(
      "Card character generation failed: generate-image must return four 3:4 portraits that reuse the first image as the reference, with a theme, title, and description for each stage.",
    );
  }

  return {
    images: parsed.data.images,
    theme: parsed.data.theme,
  };
}
