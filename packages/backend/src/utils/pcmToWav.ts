const DEFAULT_SAMPLE_RATE = 24_000;
const DEFAULT_CHANNEL_COUNT = 1;
const DEFAULT_BITS_PER_SAMPLE = 16;

/**
 * Checks whether a Gemini audio MIME type contains raw PCM data.
 *
 * @param mimeType - MIME type returned by the model.
 * @returns True when the payload needs a WAV container before writing to disk.
 */
export function isPcmAudio(mimeType: string) {
  const normalizedMimeType = mimeType.toLowerCase();

  return (
    normalizedMimeType.includes("audio/l16") ||
    normalizedMimeType.includes("audio/pcm") ||
    normalizedMimeType.includes("codec=pcm")
  );
}

/**
 * Reads a sample rate from MIME parameters such as `rate=24000`.
 *
 * @param mimeType - MIME type returned by the model.
 * @returns Parsed sample rate, falling back to Gemini's common 24 kHz PCM rate.
 */
export function parseSampleRateFromMimeType(mimeType: string) {
  const sampleRateMatch = mimeType.match(/(?:rate|sample_rate)=(\d+)/i);
  const sampleRate =
    sampleRateMatch?.[1] == null
      ? Number.NaN
      : Number.parseInt(sampleRateMatch[1], 10);

  return Number.isFinite(sampleRate) ? sampleRate : DEFAULT_SAMPLE_RATE;
}

/**
 * Wraps signed 16-bit little-endian PCM audio in a WAV container.
 *
 * @param pcmBuffer - Raw PCM audio bytes.
 * @param sampleRate - PCM sample rate in Hz.
 * @returns WAV file bytes.
 */
export function pcmToWav(pcmBuffer: Buffer, sampleRate = DEFAULT_SAMPLE_RATE) {
  const header = Buffer.alloc(44);
  const byteRate =
    (sampleRate * DEFAULT_CHANNEL_COUNT * DEFAULT_BITS_PER_SAMPLE) / 8;
  const blockAlign = (DEFAULT_CHANNEL_COUNT * DEFAULT_BITS_PER_SAMPLE) / 8;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(DEFAULT_CHANNEL_COUNT, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(DEFAULT_BITS_PER_SAMPLE, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}
