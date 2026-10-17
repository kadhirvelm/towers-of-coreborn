import { BadRequestException } from "@nestjs/common";

/**
 * Trims a generation prompt and rejects an empty one before any agent runs.
 * @param prompt - Prompt from the request body
 * @param emptyMessage - Error shown when the prompt is missing or blank
 * @returns The trimmed prompt
 * @throws BadRequestException when the trimmed prompt is empty
 */
export function requireGenerationPrompt(
  prompt: string | null | undefined,
  emptyMessage: string,
): string {
  const trimmed = prompt?.trim() ?? "";
  if (trimmed === "") {
    throw new BadRequestException(emptyMessage);
  }
  return trimmed;
}
