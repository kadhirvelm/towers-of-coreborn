import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { encodeGeneratedImageAsWebp } from "../encodeGeneratedImageAsWebp";

describe("encodeGeneratedImageAsWebp", () => {
  test("writes WebP bytes with the source dimensions", async () => {
    const source = await sharp({
      create: {
        background: { alpha: 1, b: 40, g: 80, r: 200 },
        channels: 3,
        height: 48,
        width: 32,
      },
    })
      .png()
      .toBuffer();

    const encoded = await encodeGeneratedImageAsWebp(source);
    const metadata = await sharp(encoded).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(32);
    expect(metadata.height).toBe(48);
  });
});
