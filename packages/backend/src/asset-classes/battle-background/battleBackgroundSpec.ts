import type { ImageGenerationConfig } from "src/model/types/modelRequestTypes";

export const BATTLE_BACKGROUND_FILE_NAME = "background.png";
export const BATTLE_BACKGROUND_MANIFEST_FILE_NAME = "manifest.json";

/** Wide frame the generate-image tool must use for a battle room. */
export const BATTLE_BACKGROUND_IMAGE_CONFIG: ImageGenerationConfig = {
  aspectRatio: "16:9",
  imageSize: "2K",
};

/** Shortest edge of a usable battle background, in pixels. */
export const MIN_BATTLE_BACKGROUND_WIDTH_PX = 640;
export const MIN_BATTLE_BACKGROUND_HEIGHT_PX = 360;
