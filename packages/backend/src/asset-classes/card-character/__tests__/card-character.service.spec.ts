import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import type { ConfigurationService } from "src/configuration/configuration.service";
import type { CardCharacterAgent } from "src/mastra/agents/card-character/cardCharacterAgent";
import { CardCharacterService } from "../card-character.service";
import { CARD_CHARACTER_STORAGE } from "../cardCharacterStorage";

const SET_ID = "service-spec-set";
const GENERATION_ID = "4f1c0b2e-6a7d-4c8e-9f10-123456789abc";

describe("CardCharacterService", () => {
  afterEach(async () => {
    await rm(CARD_CHARACTER_STORAGE.filePath(SET_ID), {
      force: true,
      recursive: true,
    });
  });

  test("rejects a blank prompt before calling the agent", async () => {
    const generate = mock(async () => {
      throw new Error("agent should not run");
    });
    const service = createService(generate);

    const error = await service
      .generate({ generationId: GENERATION_ID, prompt: " " })
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );
    expect(error instanceof BadRequestException).toBe(true);
    expect(generate).toHaveBeenCalledTimes(0);
  });

  test("returns the set it can read back, with absolute portrait URLs", async () => {
    await writeSet(SET_ID);
    let receivedPrompt = "";
    let receivedGenerationId = "";
    const generate = mock(
      async (input: { generationId: string; prompt: string }) => {
        receivedPrompt = input.prompt;
        receivedGenerationId = input.generationId;
        return {
          setId: SET_ID,
          summary: "done",
        };
      },
    );
    const service = createService(generate);

    const saved = await service.generate({
      generationId: GENERATION_ID,
      prompt: "  a clockwork inventor ",
    });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(receivedPrompt).toBe("a clockwork inventor");
    expect(receivedGenerationId).toBe(GENERATION_ID);
    expect(saved.setId).toBe(SET_ID);
    expect(saved.levels[0]?.url).toBe(
      `https://backend.test/static/card-characters/${SET_ID}/level-1.webp`,
    );
  });

  test("fails when the generated set cannot be read back", async () => {
    const service = createService(async () => ({
      setId: "missing-set",
      summary: "done",
    }));

    const error = await service
      .generate({ generationId: GENERATION_ID, prompt: "a knight" })
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );
    expect(error instanceof InternalServerErrorException).toBe(true);
  });

  test("stops the agent run for the generation id", async () => {
    const abort = mock(async (generationId: string) => {
      expect(generationId).toBe(GENERATION_ID);
      return true;
    });
    const service = createService(
      async () => ({ setId: SET_ID, summary: "" }),
      abort,
    );

    const stopped = await service.cancel({ generationId: GENERATION_ID });

    expect(stopped).toEqual({ stopped: true });
    expect(abort).toHaveBeenCalledTimes(1);
  });

  test("lists stored sets", async () => {
    await writeSet(SET_ID);
    const service = createService(async () => ({ setId: SET_ID, summary: "" }));

    const listed = await service.list();

    expect(listed.sets.some((set) => set.setId === SET_ID)).toBe(true);
  });
});

/**
 * @param query - Stand-in for the card-character agent
 * @returns A service pointed at the real card-character folder
 */
function createService(
  query: CardCharacterAgent["query"],
  abort: CardCharacterAgent["abort"] = async () => false,
): CardCharacterService {
  return new CardCharacterService(
    { abort, query } as unknown as CardCharacterAgent,
    {
      get: () => "https://backend.test",
    } as unknown as ConfigurationService,
  );
}

/**
 * Writes a complete four-level fixture under the card-character storage root.
 * @param setId - Folder name to create and later delete
 */
async function writeSet(setId: string): Promise<void> {
  const setDirectory = CARD_CHARACTER_STORAGE.filePath(setId);
  await mkdir(setDirectory, { recursive: true });
  const levels = [1, 2, 3, 4].map((level) => ({
    description: `Stage ${level} grows stronger.`,
    fileName: `level-${level}.webp`,
    level,
    title: `Stage ${level}`,
  }));
  await writeFile(
    CARD_CHARACTER_STORAGE.filePath(setId, "manifest.json"),
    JSON.stringify({
      createdAt: "2026-01-01T00:00:00.000Z",
      levels,
      prompt: "a clockwork inventor",
      setId,
      theme: "brass and soot",
    }),
  );
  for (const level of levels) {
    await writeFile(
      CARD_CHARACTER_STORAGE.filePath(setId, level.fileName),
      "png",
    );
  }
}
