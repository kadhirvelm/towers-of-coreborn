import { Injectable } from "@nestjs/common";
import { AgentTool } from "@towers-of-coreborn/api";
import { CardCharacterPromptRenderer } from "src/asset-classes/card-character/cardCharacterPromptRenderer";
import { CardCharacterToolService } from "src/asset-classes/card-character/cardCharacterTool.service";
import { readCardCharacterImageSet } from "src/asset-classes/card-character/readCardCharacterImageSet";
import { TowersOfCorebornAgentService } from "src/mastra/shared/towersOfCorebornAgent.service";
import {
  collectImageFilePaths,
  deleteImageFiles,
} from "src/mastra/tools/generateImageTool.service";
import { GenerationAbortCoordinator } from "../generationAbort.coordinator";
import {
  GenerationCancelledException,
  isGenerationAbort,
  throwIfAborted,
} from "../generationCancelled";
import type { QueryableAgent } from "../queryableAgent";

/**
 * Registered tools this agent calls.
 * Add a member, set to an {@link AgentTool} value, to give the agent that tool.
 */
export enum CardCharacterAgentTool {
  // biome-ignore lint/style/useLiteralEnumMembers: value is the shared AgentTool id
  GenerateImage = AgentTool.GenerateImage,
}

/**
 * Input for one card-character query.
 */
export interface CardCharacterInput {
  /** Client id used to stop this run */
  generationId: string;
  /** Natural-language description of the character */
  prompt: string;
}

/**
 * Result of one card-character query.
 */
export interface CardCharacterResult {
  /** Folder name of the saved set under the card-character storage root */
  setId: string;
  /** The coordinator agent's closing text */
  summary: string;
}

/**
 * Card-character agent. Call {@link CardCharacterAgent.query} with a
 * character description. It passes {@link CardCharacterAgentTool} to the
 * agent runner, which loads those tools from the registry. The model calls
 * `generate-image`. That tool calls Gemini or OpenAI and paints four
 * portraits, weakest to strongest.
 *
 * @example
 * ```typescript
 * const result = await cardCharacterAgent.query({
 *   generationId,
 *   prompt: "a soot-covered inventor who builds clockwork wings",
 * });
 * result.setId;
 * ```
 */
@Injectable()
export class CardCharacterAgent
  implements QueryableAgent<CardCharacterInput, CardCharacterResult>
{
  public constructor(
    private readonly agents: TowersOfCorebornAgentService,
    private readonly cardCharacterToolService: CardCharacterToolService,
    private readonly generationAbort: GenerationAbortCoordinator,
  ) {}

  /**
   * Stops an in-flight character generation on whichever process is running it.
   * @param generationId - Id passed to {@link CardCharacterAgent.query}
   * @returns Whether the stop was recorded
   */
  public abort(generationId: string): Promise<boolean> {
    return this.generationAbort.stop(generationId);
  }

  /**
   * Generates four portraits of one character, weakest to strongest.
   * @param input - User description of the character and the id that can stop it
   * @returns The saved set id and the agent's closing text
   * @throws GenerationCancelledException when the run is stopped
   * @throws InternalServerErrorException when the tool failed, was never called, or returned an unusable set
   */
  public async query(input: CardCharacterInput): Promise<CardCharacterResult> {
    const run = await this.generationAbort.begin(input.generationId);
    let toolOutput: unknown;
    try {
      throwIfAborted(run.signal);
      const result = await this.agents.runGenerationCoordinator({
        abortSignal: run.signal,
        agentId: "card-character-generation-agent",
        instructions:
          new CardCharacterPromptRenderer().renderCardCharacterPrompt(input),
        outputLabel: "Card character generation",
        prompt: input.prompt,
        readToolOutput: (raw) => raw,
        toolId: CardCharacterAgentTool.GenerateImage,
        tools: CardCharacterAgentTool,
      });
      toolOutput = result.toolOutput;
      throwIfAborted(run.signal);
      const portraits = readCardCharacterImageSet(toolOutput);
      const saved = await this.cardCharacterToolService.saveGeneratedPortraits({
        portraits,
        sourcePrompt: input.prompt,
      });
      return { setId: saved.setId, summary: result.text };
    } catch (error) {
      await deleteImageFiles(collectImageFilePaths(toolOutput));
      if (isGenerationAbort(error, run.signal)) {
        throw new GenerationCancelledException();
      }
      throw error;
    } finally {
      await run.end();
    }
  }
}
