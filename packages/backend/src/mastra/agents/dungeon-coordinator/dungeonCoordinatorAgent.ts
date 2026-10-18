import { randomUUID } from "node:crypto";
import { createTool } from "@mastra/core/tools";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { runWithProductNowSession } from "src/product-now-mcp/productNowSessionContext";
import { z } from "zod";
import {
  ASSET_CLASS_COORDINATOR_MODEL,
  TowersOfCorebornAgentService,
} from "../../shared/towersOfCorebornAgent.service";
import { BattleBackgroundAgent } from "../battle-background/battleBackgroundAgent";
import { CardCharacterAgent } from "../card-character/cardCharacterAgent";
import { CardGeneratorAgent } from "../card-generator/cardGeneratorAgent";
import { GenerationAbortCoordinator } from "../generationAbort.coordinator";
import {
  GenerationCancelledException,
  isGenerationAbort,
  throwIfAborted,
} from "../generationCancelled";
import type { QueryableAgent } from "../queryableAgent";

export const CREATE_DUNGEON_BACKGROUND_TOOL_ID = "create-dungeon-background";
export const CREATE_DUNGEON_CHARACTER_TOOL_ID = "create-dungeon-character";
export const CREATE_DUNGEON_CARD_TOOL_ID = "create-dungeon-card";

const MAX_BACKGROUNDS = 3;
const MAX_CHARACTERS = 5;
const MAX_CARDS = 15;
const DUNGEON_COORDINATOR_MAX_STEPS = 8;
const DUNGEON_COORDINATOR_TIMEOUT_MS = 60 * 60 * 1000;

const promptSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
});

const cardPromptSchema = promptSchema.extend({
  characterSetId: z
    .string()
    .describe("The setId returned by create-dungeon-character."),
});

const backgroundOutputSchema = z.object({ backgroundId: z.string() });
const characterOutputSchema = z.object({ characterSetId: z.string() });
const cardOutputSchema = z.object({
  cardId: z.string(),
  characterSetId: z.string(),
});

const DUNGEON_COORDINATOR_INSTRUCTIONS = `
You are the dungeon art director for Towers of Coreborn. Turn the user's broad
idea into a coherent set of battle rooms, named characters, and playable cards.

Use the creation tools; never merely describe assets. Unless the user gives
explicit counts, create exactly 2 backgrounds, 3 characters, and 1 card for
each character. Explicit requests may use 1-3 backgrounds, 1-5 characters, and
1-3 cards per character. Create backgrounds and characters first. Then create
cards using the exact characterSetId returned by create-dungeon-character.

Keep every prompt grounded in one shared location, faction, threat, color
palette, and story hook. Character prompts must make each role distinct. Card
prompts must name the intended character and describe an action, technique, or
piece of equipment that belongs to them. Every generated character must receive
at least one card. Finish with a short summary of the dungeon setup and do not
invent asset ids or URLs.
`;

/** Input for one dungeon coordinator run. */
export interface DungeonCoordinatorInput {
  generationId: string;
  prompt: string;
  sessionId: string;
}

/** Generated asset ids grouped by character ownership. */
export interface DungeonCoordinatorResult {
  backgroundIds: string[];
  characters: Array<{ cardIds: string[]; setId: string }>;
  summary: string;
}

interface DungeonGenerationState {
  backgroundIds: string[];
  characters: Map<string, { cardIds: string[]; prompt: string }>;
}

/**
 * Meta-agent that delegates a dungeon prompt to the existing asset agents.
 */
@Injectable()
export class DungeonCoordinatorAgent
  implements QueryableAgent<DungeonCoordinatorInput, DungeonCoordinatorResult>
{
  public constructor(
    private readonly agents: TowersOfCorebornAgentService,
    private readonly backgrounds: BattleBackgroundAgent,
    private readonly characters: CardCharacterAgent,
    private readonly cards: CardGeneratorAgent,
    private readonly generationAbort: GenerationAbortCoordinator,
  ) {}

  /**
   * Stops the coordinator and any child generation currently called by it.
   * @param generationId - Parent generation id
   * @returns Whether the stop was recorded
   */
  public abort(generationId: string): Promise<boolean> {
    return this.generationAbort.stop(generationId);
  }

  /**
   * Creates a connected set of dungeon assets from one broad prompt.
   * @param input - Prompt, ProductNow session, and cancellable generation id
   * @returns Generated ids and coordinator summary
   */
  public async query(
    input: DungeonCoordinatorInput,
  ): Promise<DungeonCoordinatorResult> {
    const run = await this.generationAbort.begin(input.generationId);
    const state: DungeonGenerationState = {
      backgroundIds: [],
      characters: new Map(),
    };

    try {
      throwIfAborted(run.signal);
      const result = await runWithProductNowSession(input.sessionId, () =>
        this.agents.runChatWithTools({
          abortSignal: run.signal,
          agentConfig: {
            id: "dungeon-coordinator-agent",
            instructions: DUNGEON_COORDINATOR_INSTRUCTIONS,
            maxSteps: DUNGEON_COORDINATOR_MAX_STEPS,
            model: [{ model: ASSET_CLASS_COORDINATOR_MODEL }],
            name: "dungeon-coordinator-agent",
            toolCallConcurrency: 3,
          },
          prompt: `Set up a dungeon from this request:\n${input.prompt}`,
          timeoutMs: DUNGEON_COORDINATOR_TIMEOUT_MS,
          tools: this.createTools(state, input.sessionId, run.signal),
        }),
      );
      throwIfAborted(run.signal);
      requireSuccessfulDungeon(result.toolErrors, state);
      return {
        backgroundIds: state.backgroundIds,
        characters: [...state.characters].map(([setId, character]) => ({
          cardIds: character.cardIds,
          setId,
        })),
        summary: result.text,
      };
    } catch (error) {
      if (isGenerationAbort(error, run.signal)) {
        throw new GenerationCancelledException();
      }
      throw error;
    } finally {
      await run.end();
    }
  }

  /**
   * Builds request-scoped tools that invoke the existing asset agents.
   * @param state - Successful child outputs for this dungeon
   * @param sessionId - ProductNow browser session for playable cards
   * @param signal - Parent cancellation signal
   * @returns Three Mastra tools for backgrounds, characters, and cards
   */
  private createTools(
    state: DungeonGenerationState,
    sessionId: string,
    signal: AbortSignal,
  ) {
    return {
      [CREATE_DUNGEON_BACKGROUND_TOOL_ID]: createTool({
        description:
          "Create and store one battle-room background. Returns its real stored id.",
        execute: async (input: z.infer<typeof promptSchema>) => {
          requireCapacity(
            state.backgroundIds.length,
            MAX_BACKGROUNDS,
            "background",
          );
          const result = await runChildGeneration(
            signal,
            (generationId) =>
              this.backgrounds.query({ generationId, prompt: input.prompt }),
            (generationId) => this.backgrounds.abort(generationId),
          );
          state.backgroundIds.push(result.id);
          return { backgroundId: result.id };
        },
        id: CREATE_DUNGEON_BACKGROUND_TOOL_ID,
        inputSchema: promptSchema,
        outputSchema: backgroundOutputSchema,
      }),
      [CREATE_DUNGEON_CHARACTER_TOOL_ID]: createTool({
        description:
          "Create and store one four-level character portrait set. Returns the setId required when creating that character's cards.",
        execute: async (input: z.infer<typeof promptSchema>) => {
          requireCapacity(state.characters.size, MAX_CHARACTERS, "character");
          const result = await runChildGeneration(
            signal,
            (generationId) =>
              this.characters.query({ generationId, prompt: input.prompt }),
            (generationId) => this.characters.abort(generationId),
          );
          state.characters.set(result.setId, {
            cardIds: [],
            prompt: input.prompt,
          });
          return { characterSetId: result.setId };
        },
        id: CREATE_DUNGEON_CHARACTER_TOOL_ID,
        inputSchema: promptSchema,
        outputSchema: characterOutputSchema,
      }),
      [CREATE_DUNGEON_CARD_TOOL_ID]: createTool({
        description:
          "Create and store one lore-backed playable card for a character created during this run.",
        execute: async (input: z.infer<typeof cardPromptSchema>) => {
          const character = state.characters.get(input.characterSetId);
          if (character === undefined) {
            throw new InternalServerErrorException(
              "Create the character first, then pass its exact setId.",
            );
          }
          const cardCount = [...state.characters.values()].reduce(
            (total, value) => total + value.cardIds.length,
            0,
          );
          requireCapacity(cardCount, MAX_CARDS, "card");
          const result = await runChildGeneration(
            signal,
            (generationId) =>
              this.cards.query({
                generationId,
                prompt: `Character:\n${character.prompt}\n\nCard request:\n${input.prompt}`,
                sessionId,
              }),
            (generationId) => this.cards.abort(generationId),
          );
          character.cardIds.push(result.cardId);
          return {
            cardId: result.cardId,
            characterSetId: input.characterSetId,
          };
        },
        id: CREATE_DUNGEON_CARD_TOOL_ID,
        inputSchema: cardPromptSchema,
        outputSchema: cardOutputSchema,
      }),
    };
  }
}

/**
 * Runs a child agent with its own generation id and links parent cancellation.
 * @param signal - Parent signal
 * @param query - Starts the child with the generated id
 * @param abort - Stops the child by id
 * @returns Child agent result
 */
async function runChildGeneration<Result>(
  signal: AbortSignal,
  query: (generationId: string) => Promise<Result>,
  abort: (generationId: string) => Promise<boolean>,
): Promise<Result> {
  throwIfAborted(signal);
  const generationId = randomUUID();
  const stopChild = () => {
    void abort(generationId);
  };
  signal.addEventListener("abort", stopChild, { once: true });
  try {
    return await query(generationId);
  } finally {
    signal.removeEventListener("abort", stopChild);
  }
}

/**
 * Prevents an agent from creating an unbounded number of expensive assets.
 * @param current - Number already created
 * @param maximum - Maximum allowed for this asset kind
 * @param label - Human-readable asset kind
 */
function requireCapacity(
  current: number,
  maximum: number,
  label: string,
): void {
  if (current >= maximum) {
    throw new InternalServerErrorException(
      `A dungeon can create at most ${maximum} ${label}s.`,
    );
  }
}

/**
 * Ensures the coordinator produced a usable setup.
 * @param toolErrors - Tool failures observed by the runner
 * @param state - Successful generated assets
 */
function requireSuccessfulDungeon(
  toolErrors: Array<{ errorMessage: string; toolName: string }>,
  state: DungeonGenerationState,
): void {
  const failedCreation = toolErrors.find((error) =>
    error.toolName.startsWith("create-dungeon-"),
  );
  if (failedCreation !== undefined) {
    throw new InternalServerErrorException(
      `Dungeon generation failed in ${failedCreation.toolName}: ${failedCreation.errorMessage}`,
    );
  }
  if (state.backgroundIds.length === 0 || state.characters.size === 0) {
    throw new InternalServerErrorException(
      "Dungeon generation must create at least one background and one character.",
    );
  }
  if (
    [...state.characters.values()].some(
      (character) => character.cardIds.length === 0,
    )
  ) {
    throw new InternalServerErrorException(
      "Dungeon generation must create at least one card for every character.",
    );
  }
}
