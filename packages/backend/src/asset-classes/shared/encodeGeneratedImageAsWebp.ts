import sharp from "sharp";

/**
 * Quality for stored generated art. High enough to keep painted detail,
 * and much smaller than PNG or JPEG.
 */
export const GENERATED_IMAGE_WEBP_QUALITY = 85;

/**
 * Re-encodes a generated image as WebP.
 * @param source - Image path or bytes from a model, or from an in-memory resize
 * @returns WebP file bytes
 */
export function encodeGeneratedImageAsWebp(
  source: Buffer | string,
): Promise<Buffer> {
  return sharp(source)
    .webp({ quality: GENERATED_IMAGE_WEBP_QUALITY })
    .toBuffer();
}
