import { BadRequestException } from "@nestjs/common";

/** `crypto.randomUUID()` values sent by the workshop. */
const GENERATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Accepts the client id used to stop a generation.
 * @param generationId - Id from the request body
 * @returns The same id when it is a UUID
 * @throws BadRequestException when the id is missing or not a UUID
 */
export function requireGenerationId(
  generationId: string | null | undefined,
): string {
  const trimmed = generationId?.trim() ?? "";
  if (!GENERATION_ID_PATTERN.test(trimmed)) {
    throw new BadRequestException("Generation id must be a UUID.");
  }
  return trimmed;
}
