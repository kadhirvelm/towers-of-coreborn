/**
 * Shape constraint for a single MCP tool declaration.
 */
export interface McpToolShape {
  payload: unknown;
  response: unknown;
}

/**
 * Shape of a collection of MCP tools. Maps a string tool name to a { payload, response } shape.
 */
export interface McpTools {
  [key: string]: McpToolShape;
}

/**
 * Maps each key in a McpTools collection to its string tool name.
 * Analogous to ServiceDefinition for REST endpoints.
 */
export type McpToolsDefinition<T extends McpTools> = {
  [Key in keyof T]: string;
};
