import type { ImageGenerationConfig } from "src/model/types/modelRequestTypes";

export const BATTLE_BACKGROUND_FILE_NAME = "background.png";
export const BATTLE_BACKGROUND_MANIFEST_FILE_NAME = "manifest.json";
export const BATTLE_BACKGROUND_IMAGE_MODEL = "gpt-image-2.5-sunburst" as const;
export const BATTLE_BACKGROUND_IMAGE_CONFIG: ImageGenerationConfig = {
  aspectRatio: "16:9",
  imageSize: "2K",
};
export const MAX_BATTLE_BACKGROUND_ATTEMPTS = 2;
