import { ToolsInput } from "@mastra/core/agent";
import { Injectable } from "@nestjs/common";
import { ToolId } from "@towers-of-coreborn/api";

type ToolRegistry = {
  [toolId in ToolId]: ToolsInput[string];
};

/**
 * Registry for shared agent tools. Asset-class tools are passed directly via
 * `TowersOfCorebornAgentService.runSingleToolChat` instead of being registered here.
 */
@Injectable()
export class TowersOfCorebornAgentToolRegistry {
  /**
   * Builds the tool registry for the TowersOfCorebornAgent.
   *
   * @param tools - The tool IDs to build the tool registry for.
   * @returns The tool registry.
   */
  public buildTools(tools: ToolId[]) {
    const toolRegistry = this.buildToolRegistry();

    return Object.fromEntries(
      tools.map((toolId): [string, ToolsInput[string]] => {
        const maybeTool = toolRegistry[toolId as keyof typeof toolRegistry];
        return [toolId, maybeTool];
      }),
    );
  }

  private buildToolRegistry(): ToolRegistry {
    return {};
  }
}
