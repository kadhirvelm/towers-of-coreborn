import { Injectable } from "@nestjs/common";
import { BATTLE_BACKGROUND_AGENT_INSTRUCTIONS } from "src/asset-classes/battle-background/battleBackgroundPrompt";
import {
  BATTLE_BACKGROUND_TOOL_ID,
  BattleBackgroundToolService,
} from "src/asset-classes/battle-background/battleBackgroundTool.service";
import { readToolStrings } from "src/asset-classes/shared/readToolStrings";
import { TowersOfCorebornAgentService } from "src/mastra/shared/towersOfCorebornAgent.service";
import type { QueryableAgent } from "../queryableAgent";

/** Input for one battle-background query. */
export interface BattleBackgroundInput {
  /** Natural-language description of the battle room */
  prompt: string;
}

/** Result of one battle-background query. */
export interface BattleBackgroundResult {
  /** Folder name of the stored background */
  id: string;
  /** The coordinator agent's closing text */
  summary: string;
}

/**
 * Battle-background agent. Call {@link BattleBackgroundAgent.query} with a
 * room description to direct, paint, and store one battle background.
 */
@Injectable()
export class BattleBackgroundAgent
  implements QueryableAgent<BattleBackgroundInput, BattleBackgroundResult>
{
  public constructor(
    private readonly agents: TowersOfCorebornAgentService,
    private readonly toolService: BattleBackgroundToolService,
  ) {}

  /**
   * Generates and stores one battle-room background.
   * @param input - User's room description
   * @returns Stored background id and coordinator summary
   */
  public async query(
    input: BattleBackgroundInput,
  ): Promise<BattleBackgroundResult> {
    const { text, toolOutput } = await this.agents.runGenerationCoordinator({
      agentId: "battle-background-generation-agent",
      instructions: BATTLE_BACKGROUND_AGENT_INSTRUCTIONS,
      outputLabel: "Battle background generation",
      prompt: input.prompt,
      readToolOutput: readBackgroundId,
      tool: this.toolService.createBattleBackgroundTool(),
      toolId: BATTLE_BACKGROUND_TOOL_ID,
    });

    return { id: toolOutput, summary: text };
  }
}

/**
 * Reads the stored background id from the tool result.
 * @param value - Raw tool result
 * @returns Stored background id
 */
function readBackgroundId(value: unknown): string {
  return readToolStrings(
    value,
    ["id"],
    "Battle background generation returned an unexpected result.",
  ).id;
}
