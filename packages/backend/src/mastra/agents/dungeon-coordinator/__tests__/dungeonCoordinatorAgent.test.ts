import { describe, expect, mock, test } from "bun:test";
import type { ToolsInput } from "@mastra/core/agent";
import { GenerationAbortCoordinator } from "../../generationAbort.coordinator";
import {
  CREATE_DUNGEON_BACKGROUND_TOOL_ID,
  CREATE_DUNGEON_CARD_TOOL_ID,
  CREATE_DUNGEON_CHARACTER_TOOL_ID,
  DungeonCoordinatorAgent,
} from "../dungeonCoordinatorAgent";

const GENERATION_ID = "4f1c0b2e-6a7d-4c8e-9f10-123456789abc";

describe("DungeonCoordinatorAgent", () => {
  test("delegates connected assets to the existing agents", async () => {
    const backgroundQuery = mock(async () => ({
      id: "room-1",
      summary: "room",
    }));
    const characterQuery = mock(async () => ({
      setId: "hero-1",
      summary: "hero",
    }));
    const cardQuery = mock(
      async (_input: {
        generationId: string;
        prompt: string;
        sessionId: string;
      }) => ({ cardId: "card-1" }),
    );
    const runChatWithTools = mock(
      async (input: { timeoutMs?: number; tools: ToolsInput }) => {
        const background = await executeTool(
          input.tools,
          CREATE_DUNGEON_BACKGROUND_TOOL_ID,
          { prompt: "The flooded bell chamber" },
        );
        const character = await executeTool(
          input.tools,
          CREATE_DUNGEON_CHARACTER_TOOL_ID,
          { prompt: "Mara, keeper of the drowned bells" },
        );
        if (character.characterSetId === undefined) {
          throw new Error("Character tool did not return an id.");
        }
        await executeTool(input.tools, CREATE_DUNGEON_CARD_TOOL_ID, {
          characterSetId: character.characterSetId,
          prompt: "Swing the cracked bell clapper",
        });

        expect(background.backgroundId).toBe("room-1");
        expect(input.timeoutMs).toBe(60 * 60 * 1000);
        return {
          text: "A drowned belfry dungeon.",
          toolErrors: [],
          toolResults: [],
        };
      },
    );
    const agent = new DungeonCoordinatorAgent(
      { runChatWithTools } as never,
      { abort: async () => true, query: backgroundQuery } as never,
      { abort: async () => true, query: characterQuery } as never,
      { abort: async () => true, query: cardQuery } as never,
      idleAbort() as never,
    );

    const result = await agent.query({
      generationId: GENERATION_ID,
      prompt: "A dungeon in a drowned bell tower",
      sessionId: "session-1",
    });

    expect(result).toEqual({
      backgroundIds: ["room-1"],
      characters: [{ cardIds: ["card-1"], setId: "hero-1" }],
      summary: "A drowned belfry dungeon.",
    });
    expect(backgroundQuery).toHaveBeenCalledTimes(1);
    expect(characterQuery).toHaveBeenCalledTimes(1);
    expect(cardQuery).toHaveBeenCalledTimes(1);
    expect(cardQuery.mock.calls[0]?.[0]).toEqual({
      generationId: expect.any(String),
      prompt:
        "Character:\nMara, keeper of the drowned bells\n\nCard request:\nSwing the cracked bell clapper",
      sessionId: "session-1",
    });
  });

  test("rejects a setup when a character has no card", async () => {
    const runChatWithTools = mock(async (input: { tools: ToolsInput }) => {
      await executeTool(input.tools, CREATE_DUNGEON_BACKGROUND_TOOL_ID, {
        prompt: "A room",
      });
      await executeTool(input.tools, CREATE_DUNGEON_CHARACTER_TOOL_ID, {
        prompt: "A guardian",
      });
      return { text: "Incomplete", toolErrors: [], toolResults: [] };
    });
    const agent = new DungeonCoordinatorAgent(
      { runChatWithTools } as never,
      {
        abort: async () => true,
        query: async () => ({ id: "room-1", summary: "" }),
      } as never,
      {
        abort: async () => true,
        query: async () => ({ setId: "hero-1", summary: "" }),
      } as never,
      {
        abort: async () => true,
        query: async () => ({ cardId: "unused" }),
      } as never,
      idleAbort() as never,
    );

    const error = await agent
      .query({
        generationId: GENERATION_ID,
        prompt: "An incomplete dungeon",
        sessionId: "session-1",
      })
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );

    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toContain(
      "at least one card for every character",
    );
  });
});

/**
 * Executes one request-scoped Mastra tool in a unit test.
 * @param tools - Tools supplied to the coordinator
 * @param id - Tool id
 * @param input - Tool payload
 * @returns Tool result
 */
async function executeTool(
  tools: ToolsInput,
  id: string,
  input: Record<string, string>,
): Promise<Record<string, string>> {
  const tool = tools[id] as {
    execute?: (payload: Record<string, string>) => Promise<unknown>;
  };
  if (tool.execute === undefined) {
    throw new Error(`Tool ${id} has no execute function.`);
  }
  return (await tool.execute(input)) as Record<string, string>;
}

/**
 * @returns An abort coordinator that never cancels
 */
function idleAbort(): Pick<GenerationAbortCoordinator, "begin" | "stop"> {
  return {
    begin: async () => ({
      end: async () => undefined,
      signal: new AbortController().signal,
    }),
    stop: async () => true,
  };
}
