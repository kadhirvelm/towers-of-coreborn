/**
 * Tools are read-only operations provided to the agent that allow it to fetch or retrieve useful context from the system.
 * They enable the agent to access documents, attachments, or relevant search information as needed, without modifying any underlying data.
 * By using these tools, the agent augments its information-gathering and reasoning capabilities, facilitating smarter and more aware responses,
 * while ensuring the integrity of the system's data is maintained.
 *
 * Asset-class generation tools are not registered here: each asset class owns
 * its tool on the backend (`packages/backend/src/asset-classes/<class>/`).
 */

import { GenericType, VisitorPattern } from "../genericTypes";

export interface AgentBasicTool {
  type: string;
}

/** Shared agent tools keyed by name. Add an entry here for tools any agent can use. */
export type AllAgentTools = Record<never, AgentBasicTool>;

/**
 * When adding a new document action, you'll need to update the following places (all enforced by typescript):
 */
export type AgentPerformToolCall = GenericType<AllAgentTools>;

type AvailableTools = {
  [key in keyof AllAgentTools]: AllAgentTools[key]["type"];
};

/**
 * The AvailableTools is the type of the tool that the agent can perform.
 */
export const AvailableTools: AvailableTools = {};

/**
 * The ToolId is the type of the tool that the agent is performing.
 */
export type ToolId = AgentPerformToolCall["type"];

/** Convenience visitor pattern for document actions — ensures all new actions are properly handled. */
export const AgentTools: VisitorPattern<AllAgentTools> = {
  typeChecks: {},
  visit: (value, visitor) => visitor.unknown(value),
};
