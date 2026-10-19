import { createTool } from "@mastra/core/tools";
import { throwIfAborted } from "src/mastra/agents/generationCancelled";
import { z } from "zod";
import { ENEMY_PATTERN_LENGTH, enemyPatternSchema } from "./enemyPattern";

/** Tool the enemy agent calls after designing the creature and its health. */
export const SUBMIT_ENEMY_TOOL_ID = "submit-enemy";

const submitEnemySchema = z.object({
  description: z.string().trim().min(20).max(800),
  maxHitPoints: z.number().int().min(1).max(500),
  name: z.string().trim().min(2).max(80),
  pattern: enemyPatternSchema,
  scene: z.string().trim().min(20).max(4000),
});

/** Accepted enemy design stored beside its portrait. */
export type EnemyDraft = z.infer<typeof submitEnemySchema>;

/** Per-query state filled by the submit-enemy tool. */
export interface EnemyGenerationState {
  draft?: EnemyDraft;
}

/**
 * Builds the request-scoped enemy submission tool.
 * @param state - State that receives the accepted enemy
 * @param signal - Stops submission when generation is cancelled
 * @returns A Mastra tool keyed by {@link SUBMIT_ENEMY_TOOL_ID}
 */
export function createEnemyTools(
  state: EnemyGenerationState,
  signal: AbortSignal,
) {
  return {
    [SUBMIT_ENEMY_TOOL_ID]: createTool({
      description: `Submit the enemy's name, description, maximum health, attack cycle, and full portrait scene before painting it. Normal enemies usually have 20-60 health; bosses may have 80-200. pattern is ${ENEMY_PATTERN_LENGTH.min} to ${ENEMY_PATTERN_LENGTH.max} attack or defend actions, using playable-card amounts, taken in order and then repeated.`,
      execute: async (input: EnemyDraft) => {
        throwIfAborted(signal);
        state.draft = input;
        return { accepted: true, message: "Enemy accepted." };
      },
      id: SUBMIT_ENEMY_TOOL_ID,
      inputSchema: submitEnemySchema,
      outputSchema: z.object({
        accepted: z.literal(true),
        message: z.string(),
      }),
    }),
  };
}
