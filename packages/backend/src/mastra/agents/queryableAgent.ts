/**
 * How to run an agent under `src/mastra/agents`.
 * Inject the agent's Nest service and call `query`.
 * @typeParam TInput - What the caller passes in
 * @typeParam TResult - What the agent returns
 */
export interface QueryableAgent<TInput, TResult> {
  /**
   * Runs the agent once.
   * @param input - What the caller wants the agent to do
   * @returns The agent's result
   */
  query(input: TInput): Promise<TResult>;
}
