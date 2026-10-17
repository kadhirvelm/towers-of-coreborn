import type { ImageGenerationConfig } from "./types/modelRequestTypes";

const DEFAULT_IMAGE_GENERATION_CONFIG: ImageGenerationConfig = {
  aspectRatio: "1:1",
  imageSize: "1K",
};

/**
 * Exact aspect-ratio sizes accepted by GPT Image 2.5.
 * Each edge is a multiple of 16, and the pixel count stays inside the model's limits.
 */
const OPENAI_IMAGE_SIZES: Record<
  ImageGenerationConfig["aspectRatio"],
  Record<ImageGenerationConfig["imageSize"], string>
> = {
  "1:1": { "1K": "1024x1024", "2K": "2048x2048" },
  "3:4": { "1K": "768x1024", "2K": "1536x2048" },
  "4:3": { "1K": "1024x768", "2K": "2048x1536" },
  "9:16": { "1K": "720x1280", "2K": "1152x2048" },
  "16:9": { "1K": "1280x720", "2K": "2048x1152" },
};

/**
 * Maps shared image settings onto an OpenAI `WIDTHxHEIGHT` size.
 * @param imageConfig - Requested aspect ratio and size class. Defaults to a square 1K image.
 * @returns Size string accepted by the Image API
 */
export function resolveOpenAIImageSize(
  imageConfig?: ImageGenerationConfig,
): string {
  const config = imageConfig ?? DEFAULT_IMAGE_GENERATION_CONFIG;
  return OPENAI_IMAGE_SIZES[config.aspectRatio][config.imageSize];
}
