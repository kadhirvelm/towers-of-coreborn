import { createTool } from "@mastra/core/tools";
import type { PlayableCardLoreSource } from "@towers-of-coreborn/api";
import { throwIfAborted } from "src/mastra/agents/generationCancelled";
import { ProductNowMcpService } from "src/product-now-mcp/product-now-mcp.service";
import { z } from "zod";
import { parseLoreSearchResult } from "./parseLoreSearchResult";
import { CARD_GAME_FOLDER_ID } from "./playableCardSpec";
import {
  type PlayableCardDraft,
  validatePlayableCardDraft,
} from "./validatePlayableCardDraft";

/** Tool the writer must call against the ProductNow Lore document. */
export const SEARCH_LORE_TOOL_ID = "search-lore";

/** Tool the writer calls once the card is grounded in Lore passages. */
export const SUBMIT_PLAYABLE_CARD_TOOL_ID = "submit-playable-card";

/**
 * Lore passages and the accepted card for one generation.
 * The research tools write into this object while the agent runs.
 */
export interface PlayableCardResearchState {
  draft?: PlayableCardDraft;
  loreSources: PlayableCardLoreSource[];
}

const searchInputSchema = z.object({
  query: z
    .string()
    .describe(
      "A specific Lore question, such as a floor, a Coreborn bond, the Trials, the Warden Compact, the Sundering, or the Verity.",
    ),
});

const effectSchema = z.object({
  amount: z
    .number()
    .describe("Attack or defend 4-16, draw 1-2, aether 1-3, combo 6-20."),
  chainsFrom: z
    .string()
    .describe(
      "For combo, the earlier card kind: attack, defend, draw, or aether. Empty string otherwise.",
    ),
  kind: z
    .string()
    .describe("One toolkit kind: attack, defend, draw, aether, or combo."),
  text: z
    .string()
    .describe("Rules text the player reads. 8 to 160 characters."),
});

const submitInputSchema = z.object({
  aetherCost: z
    .number()
    .describe("Aether spent to play the card, from 1 to 4."),
  description: z
    .string()
    .describe(
      "Flavor text: one or two short sentences, 20 to 240 characters. A vague, mysterious hint of what this card is in the Tower's lore.",
    ),
  effects: z
    .array(effectSchema)
    .describe("One or two effects. Each kind may appear once."),
  name: z.string().describe("Card name, 2 to 48 characters."),
  scene: z
    .string()
    .describe(
      "What to paint, 16 to 800 characters. Subject and setting only. No letters or card frame.",
    ),
});

const searchOutputSchema = z.object({
  message: z.string(),
});

const submitOutputSchema = z.object({
  accepted: z.boolean(),
  message: z.string(),
});

/**
 * Lore search and card submission for one card-generator run.
 * These close over the browser's ProductNow session, so they are built per query
 * and passed beside the shared generate-image tool.
 * @param params - Session, the state the tools fill in, and the signal that stops the run
 * @returns Mastra tools keyed by the id the model calls
 */
export function createPlayableCardResearchTools(params: {
  productNow: ProductNowMcpService;
  sessionId: string;
  signal: AbortSignal;
  state: PlayableCardResearchState;
}) {
  return {
    [SEARCH_LORE_TOOL_ID]: createTool({
      description:
        "Search inside the ProductNow Lore document for the Reach. Returns only passages from that document. Call this with a specific place, person, order, or event before writing the card. If it returns no passages, call it again with a narrower query.",
      execute: async (input: z.infer<typeof searchInputSchema>) =>
        searchLore(input, params),
      id: SEARCH_LORE_TOOL_ID,
      inputSchema: searchInputSchema,
      outputSchema: searchOutputSchema,
    }),
    [SUBMIT_PLAYABLE_CARD_TOOL_ID]: createTool({
      description:
        "Submit the finished card after search-lore has returned passages. Description is one or two short, vague sentences that hint at the card's place in the Tower's lore. Effects stay inside the combat toolkit.",
      execute: async (input: z.infer<typeof submitInputSchema>) =>
        submitCard(input, params),
      id: SUBMIT_PLAYABLE_CARD_TOOL_ID,
      inputSchema: submitInputSchema,
      outputSchema: submitOutputSchema,
    }),
  };
}

/**
 * Searches ProductNow and keeps only Lore-document passages.
 * @param input - The model's search query
 * @param params - Session, collected passages, and the abort signal
 * @returns Text the model should read next
 */
async function searchLore(
  input: z.infer<typeof searchInputSchema>,
  params: {
    productNow: ProductNowMcpService;
    sessionId: string;
    signal: AbortSignal;
    state: PlayableCardResearchState;
  },
): Promise<{ message: string }> {
  throwIfAborted(params.signal);
  const query = input.query.trim();
  if (query.length < 2 || query.length > 400) {
    return { message: "Pass a query of 2 to 400 characters." };
  }

  const raw = await params.productNow.callTool(
    params.sessionId,
    "search",
    {
      folderId: CARD_GAME_FOLDER_ID,
      query,
      resultType: "documents",
      searchScope: "workspace",
    },
    params.signal,
  );
  throwIfAborted(params.signal);
  const hits = parseLoreSearchResult(raw);
  for (const hit of hits) {
    const alreadyKept = params.state.loreSources.some(
      (source) => source.excerpt === hit.excerpt,
    );
    if (!alreadyKept) {
      params.state.loreSources.push(hit);
    }
  }
  return { message: formatLoreHits(hits) };
}

/**
 * Accepts a card only after at least one Lore passage has been retrieved.
 * @param input - The model's card draft
 * @param params - Collected passages and where to store an accepted draft
 * @returns Whether the card was accepted, and a message the model can correct from
 */
function submitCard(
  input: z.infer<typeof submitInputSchema>,
  params: {
    signal: AbortSignal;
    state: PlayableCardResearchState;
  },
): { accepted: boolean; message: string } {
  throwIfAborted(params.signal);
  if (params.state.loreSources.length === 0) {
    return {
      accepted: false,
      message:
        "Search the Lore document and use a returned passage before submitting.",
    };
  }

  const validated = validatePlayableCardDraft(input);
  if ("error" in validated) {
    return { accepted: false, message: validated.error };
  }

  params.state.draft = validated.draft;
  return { accepted: true, message: "Card accepted." };
}

/**
 * @param hits - Lore passages from one search
 * @returns Text returned to the model
 */
function formatLoreHits(hits: PlayableCardLoreSource[]): string {
  if (hits.length === 0) {
    return "No passages in the Lore document matched. Search again with a specific Reach subject: a floor, the Trials, a Coreborn, the Warden Compact, the Sundering, or the Verity.";
  }

  const lines = hits.map((hit, index) => `${index + 1}. ${hit.excerpt}`);
  return ["Lore document passages:", ...lines].join("\n");
}
