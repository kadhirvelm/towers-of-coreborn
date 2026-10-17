/**
 * Scale that fits a texture inside a frame without cropping or stretching.
 * @param sourceWidth - Unscaled texture width in pixels
 * @param sourceHeight - Unscaled texture height in pixels
 * @param frameWidth - Maximum display width in pixels
 * @param frameHeight - Maximum display height in pixels
 * @returns Uniform scale. Returns 1 when the source size is not positive
 */
export function containedScale(
  sourceWidth: number,
  sourceHeight: number,
  frameWidth: number,
  frameHeight: number,
): number {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return 1;
  }
  if (frameWidth <= 0 || frameHeight <= 0) {
    return 0;
  }
  return Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight);
}
