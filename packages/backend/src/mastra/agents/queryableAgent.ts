/**
 * How to run an agent under `src/mastra/agents`.
 * Inject the agent's Nest service and call `query`.
 * @typeParam TInput - What the caller passes in
 * @typeParam TResult - What the agent returns
 */
export interface QueryableAgent<TInput, TResult> {
  /**
   * Stops an in-flight {@link QueryableAgent.query}.
   * A stop that arrives before the query starts still aborts that query.
   * @param generationId - Id the caller passed to `query`
   * @returns Whether the stop was recorded for every process
   */
  abort(generationId: string): Promise<boolean>;
  /**
   * Runs the agent once.
   * @param input - What the caller wants the agent to do
   * @returns The agent's result
   */
  query(input: TInput): Promise<TResult>;
}
