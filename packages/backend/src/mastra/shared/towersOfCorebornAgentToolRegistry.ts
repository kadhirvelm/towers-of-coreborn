import { ToolsInput } from "@mastra/core/agent";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import {
  AgentTool,
  type AgentToolSelection,
  type ToolId,
} from "@towers-of-coreborn/api";
import { GenerateImageToolService } from "../tools/generateImageTool.service";

type ToolRegistry = {
  [toolId in ToolId]: ToolsInput[string];
};

/**
 * Catalog of tools a Towers of Coreborn agent can be given.
 *
 * Add the id to {@link AgentTool}, then register the implementation in
 * {@link TowersOfCorebornAgentToolRegistry.buildToolRegistry}. An agent
 * declares its own enum of the {@link AgentTool} members it calls and passes
 * that enum to {@link TowersOfCorebornAgentToolRegistry.buildTools}.
 */
@Injectable()
export class TowersOfCorebornAgentToolRegistry {
  public constructor(
    private readonly generateImageToolService: GenerateImageToolService,
  ) {}

  /**
   * Resolves a tool list or an agent tool enum into Mastra tools.
   * @param tools - {@link AgentTool} members, or an enum whose values are those members. An empty list gives the agent no tools.
   * @returns Tools keyed by the id the model calls
   * @throws InternalServerErrorException when an id is missing from the catalog
   */
  public buildTools(tools: AgentToolSelection): ToolsInput {
    const toolRegistry = this.buildToolRegistry();
    const toolIds = listToolIds(tools);

    return Object.fromEntries(
      toolIds.map((toolId) => {
        const tool = toolRegistry[toolId];
        if (tool === undefined) {
          throw new InternalServerErrorException(
            `No tool is registered for ${toolId}.`,
          );
        }
        return [toolId, tool] as const;
      }),
    );
  }

  /**
   * The full tool catalog. Every {@link ToolId} has one entry.
   * @returns Tools keyed by id
   */
  private buildToolRegistry(): ToolRegistry {
    return {
      [AgentTool.GenerateImage]: this.generateImageToolService.createTool(),
    };
  }
}

/**
 * @param tools - A list of tool ids, or an enum of them
 * @returns The ids in declaration order
 * @throws InternalServerErrorException when a value is not an {@link AgentTool} member
 */
function listToolIds(tools: AgentToolSelection): ToolId[] {
  const values = Array.isArray(tools) ? tools : Object.values(tools);
  return values.map((value) => {
    if (!isToolId(value)) {
      throw new InternalServerErrorException(
        `No tool is registered for ${value}.`,
      );
    }
    return value;
  });
}

/**
 * @param value - Candidate tool id from a list or an agent enum
 * @returns Whether the catalog defines that id
 */
function isToolId(value: string): value is ToolId {
  return Object.values(AgentTool).some((toolId) => toolId === value);
}

type ToolRegistry = {
  [toolId in ToolId]: ToolsInput[string];
};

/**
 * Catalog of tools a Towers of Coreborn agent can be given.
 *
 * Declare the tool id in `packages/api/src/agents/tools.ts`, then add it in
 * {@link TowersOfCorebornAgentToolRegistry.buildToolRegistry}. Agents request
 * tools by id through {@link TowersOfCorebornAgentToolRegistry.buildTools}.
 */
@Injectable()
export class TowersOfCorebornAgentToolRegistry {
  public constructor(
    private readonly generateImageToolService: GenerateImageToolService,
  ) {}

  /**
   * Resolves tool ids to the Mastra tools an agent should receive.
   * @param tools - Tool ids to include. An empty list gives the agent no tools.
   * @returns Tools keyed by the id the model calls
   * @throws InternalServerErrorException when an id is missing from the catalog
   */
  public buildTools(tools: ToolId[]): ToolsInput {
    const toolRegistry = this.buildToolRegistry();

    return Object.fromEntries(
      tools.map((toolId) => {
        const tool = toolRegistry[toolId];
        if (tool === undefined) {
          throw new InternalServerErrorException(
            `No tool is registered for ${toolId}.`,
          );
        }
        return [toolId, tool] as const;
      }),
    );
  }

  /**
   * The full tool catalog. Every {@link ToolId} has one entry.
   * @returns Tools keyed by id
   */
  private buildToolRegistry(): ToolRegistry {
    return {
      "generate-image": this.generateImageToolService.createTool(),
    };
  }
}
