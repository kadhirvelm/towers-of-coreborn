import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { AgentTool } from "@towers-of-coreborn/api";
import { CardCharacterPromptRenderer } from "src/asset-classes/card-character/cardCharacterPromptRenderer";
import { CardCharacterToolService } from "src/asset-classes/card-character/cardCharacterTool.service";
import { readCardCharacterImageSet } from "src/asset-classes/card-character/readCardCharacterImageSet";
import { TowersOfCorebornAgentService } from "src/mastra/shared/towersOfCorebornAgent.service";
import { TowersOfCorebornAgentToolRegistry } from "src/mastra/shared/towersOfCorebornAgentToolRegistry";
import {
  collectImageFilePaths,
  deleteImageFiles,
} from "src/mastra/tools/generateImageTool.service";
import type { QueryableAgent } from "../queryableAgent";

/**
 * Registered tools this agent calls.
 * Add a member, set to an {@link AgentTool} value, to give the agent that tool.
 */
export enum CardCharacterAgentTool {
  GenerateImage = AgentTool.GenerateImage,
}

/**
 * Input for one card-character query.
 */
export interface CardCharacterInput {
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
 * character description. It passes {@link CardCharacterAgentTool} to the tool
 * registry, so the model can call `generate-image`. That tool calls Gemini or
 * OpenAI and paints four portraits, weakest to strongest.
 *
 * @example
 * ```typescript
 * const result = await cardCharacterAgent.query({
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
    private readonly toolRegistry: TowersOfCorebornAgentToolRegistry,
    private readonly cardCharacterToolService: CardCharacterToolService,
  ) {}

  /**
   * Generates four portraits of one character, weakest to strongest.
   * @param input - User description of the character
   * @returns The saved set id and the agent's closing text
   * @throws InternalServerErrorException when the tool failed, was never called, or returned an unusable set
   */
  public async query(input: CardCharacterInput): Promise<CardCharacterResult> {
    const tool = this.toolRegistry.buildTools(CardCharacterAgentTool)[
      CardCharacterAgentTool.GenerateImage
    ];
    if (tool === undefined) {
      throw new InternalServerErrorException(
        `The ${CardCharacterAgentTool.GenerateImage} tool is not registered.`,
      );
    }

    let toolOutput: unknown;
    try {
      const result = await this.agents.runGenerationCoordinator({
        agentId: "card-character-generation-agent",
        instructions:
          new CardCharacterPromptRenderer().renderCardCharacterPrompt(input),
        outputLabel: "Card character generation",
        prompt: input.prompt,
        readToolOutput: (raw) => raw,
        tool,
        toolId: CardCharacterAgentTool.GenerateImage,
      });
      toolOutput = result.toolOutput;
      const portraits = readCardCharacterImageSet(toolOutput);
      const saved = await this.cardCharacterToolService.saveGeneratedPortraits({
        portraits,
        sourcePrompt: input.prompt,
      });
      return { setId: saved.setId, summary: result.text };
    } catch (error) {
      await deleteImageFiles(collectImageFilePaths(toolOutput));
      throw error;
    }
  }
}
