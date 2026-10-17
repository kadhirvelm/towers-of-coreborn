import { Injectable } from "@nestjs/common";
import { ConfigurationService } from "src/configuration/configuration.service";
import { TowersOfCorebornAgentService } from "src/mastra/shared/towersOfCorebornAgent.service";
import { TowersOfCorebornAgentToolRegistry } from "src/mastra/shared/towersOfCorebornAgentToolRegistry";
import { readToolStrings } from "../shared/readToolStrings";
import { CardCharacterPromptRenderer } from "./cardCharacterPromptRenderer";
import {
  CARD_CHARACTER_TOOL_ID,
  CardCharacterToolService,
} from "./cardCharacterTool.service";

/**
 * Input for generating a four-level card character from a natural-language description.
 */
export interface CardCharacterGenerationInput {
  prompt: string;
}

/**
 * Result of card-character generation.
 */
export interface CardCharacterGenerationResult {
  /** Folder name of the saved set under the card-character storage root */
  setId: string;
  /** The coordinator agent's closing text */
  summary: string;
}

/**
 * Mastra coordinator for four-level card characters.
 *
 * The agent calls the card-character tool once with a locked identity, the
 * user's theme, and four power stages. `runGenerationCoordinator` fails the
 * request unless that tool completed.
 *
 * @example
 * ```typescript
 * const result = await cardCharacterGenerationAgentService.generate({
 *   prompt: "a soot-covered inventor who builds clockwork wings",
 * });
 * result.setId; // "3f1c…"
 * ```
 */
@Injectable()
export class CardCharacterGenerationAgentService extends TowersOfCorebornAgentService {
  public constructor(
    towersOfCorebornAgentToolRegistry: TowersOfCorebornAgentToolRegistry,
    configurationService: ConfigurationService,
    private readonly cardCharacterToolService: CardCharacterToolService,
  ) {
    super(towersOfCorebornAgentToolRegistry, configurationService);
  }

  /**
   * Generates four portraits of one character, weakest to strongest.
   * @param input - User description of the character
   * @returns The saved set id and the agent's closing text
   * @throws InternalServerErrorException when the tool failed or was never called
   */
  public async generate(
    input: CardCharacterGenerationInput,
  ): Promise<CardCharacterGenerationResult> {
    const { text, toolOutput } = await this.runGenerationCoordinator({
      agentId: "card-character-generation-agent",
      instructions: new CardCharacterPromptRenderer().renderCardCharacterPrompt(
        input,
      ),
      outputLabel: "Card character generation",
      prompt: input.prompt,
      readToolOutput: readSetId,
      tool: this.cardCharacterToolService.createCardCharacterTool(),
      toolId: CARD_CHARACTER_TOOL_ID,
    });

    return { setId: toolOutput, summary: text };
  }
}

/**
 * Pulls the saved set id out of the tool result.
 * @param rawResult - The card-character tool's returned value
 * @returns The set id
 * @throws InternalServerErrorException if the tool returned an unexpected shape
 */
function readSetId(rawResult: unknown): string {
  return readToolStrings(
    rawResult,
    ["setId"],
    "Card character generation failed: the tool returned an unexpected result shape.",
  ).setId;
}
