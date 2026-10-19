import type { ImageGenerationConfig } from "src/model/types/modelRequestTypes";

export const ENEMY_FILE_NAME = "enemy.webp";
export const ENEMY_MANIFEST_FILE_NAME = "manifest.json";

/** Portrait frame the generate-image tool must use for an enemy. */
export const ENEMY_IMAGE_CONFIG: ImageGenerationConfig = {
  aspectRatio: "3:4",
  imageSize: "1K",
};

/** Shortest edge of a usable enemy portrait, in pixels. */
export const MIN_ENEMY_EDGE_PX = 64;
