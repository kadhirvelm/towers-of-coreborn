/**
 * Tools a Mastra agent can call.
 *
 * Add a member to {@link AgentTool}, a matching entry in `AllAgentTools`,
 * and an implementation in
 * `packages/backend/src/mastra/shared/towersOfCorebornAgentToolRegistry.ts`.
 * An agent opts in by declaring its own enum whose values are these members.
 */

import { EnumValues, GenericType, VisitorPattern } from "../genericTypes";

export interface AgentBasicTool {
  type: string;
}

/**
 * Every tool the registry can give an agent.
 * The value is the id the model calls.
 */
export enum AgentTool {
  /**
   * Asks the ProductNow research subagent one question about the Spire, the Reach, or other lore.
   * The subagent loads ProductNow's read tools for the browser session.
   */
  ConsultProductNow = "consult-productnow",
  /** Paints one or more images with Gemini or OpenAI. */
  GenerateImage = "generate-image",
}

/**
 * Runs the ProductNow research subagent for one lore question.
 */
export interface ConsultProductNowTool extends AgentBasicTool {
  type: AgentTool.ConsultProductNow;
}

/**
 * Generates one or more images by calling Gemini or OpenAI.
 */
export interface GenerateImageTool extends AgentBasicTool {
  type: AgentTool.GenerateImage;
}

/** Shared agent tools keyed by name. Add an entry here for tools any agent can use. */
export type AllAgentTools = {
  consultProductNow: ConsultProductNowTool;
  generateImage: GenerateImageTool;
};

/**
 * When adding a new tool, update {@link AgentTool}, `AllAgentTools`, and `AgentTools`.
 */
export type AgentPerformToolCall = GenericType<AllAgentTools>;

/**
 * The id of a tool an agent can call.
 */
export type ToolId = EnumValues<typeof AgentTool>;

/**
 * Tools to give an agent.
 * Pass a list of {@link AgentTool} members, or an enum declared on the agent
 * whose values are those members.
 */
export type AgentToolSelection = readonly ToolId[] | Record<string, string>;

/** Visitor for agent tools. Adding a tool requires a branch here. */
export const AgentTools: VisitorPattern<AllAgentTools> = {
  typeChecks: {
    consultProductNow: (value): value is ConsultProductNowTool =>
      value.type === AgentTool.ConsultProductNow,
    generateImage: (value): value is GenerateImageTool =>
      value.type === AgentTool.GenerateImage,
  },
  visit: (value, visitor) => {
    if (AgentTools.typeChecks.consultProductNow(value)) {
      return visitor.consultProductNow(value);
    }
    if (AgentTools.typeChecks.generateImage(value)) {
      return visitor.generateImage(value);
    }

    return visitor.unknown(value);
  },
};
