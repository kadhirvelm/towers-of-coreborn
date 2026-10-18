import { BadRequestException } from "@nestjs/common";

/** `crypto.randomUUID()` values used for dungeons, slots, and stored assets. */
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Accepts an id that will be used as a folder name.
 * @param value - Id from a request body
 * @param label - What the id names, used in the error
 * @returns The trimmed id
 * @throws BadRequestException when the value is missing or not a UUID
 */
export function requireDungeonId(
  value: string | null | undefined,
  label: string,
): string {
  const trimmed = value?.trim() ?? "";
  if (!UUID_V4_PATTERN.test(trimmed)) {
    throw new BadRequestException(`${label} must be a UUID.`);
  }
  return trimmed;
}
