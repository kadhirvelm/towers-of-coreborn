import type OpenAI from "openai";

/** Tool the writer must call against the ProductNow Lore document. */
export const SEARCH_LORE_TOOL_NAME = "search_lore";

/** Tool the writer calls once the card is grounded in Lore passages. */
export const SUBMIT_PLAYABLE_CARD_TOOL_NAME = "submit_playable_card";

const effectParameters = {
  additionalProperties: false,
  properties: {
    amount: {
      description: "Attack or defend 4-16, draw 1-2, aether 1-3, combo 6-20.",
      type: "integer",
    },
    chainsFrom: {
      description:
        "For combo, the earlier card kind: attack, defend, draw, or aether. Empty string otherwise.",
      enum: ["attack", "defend", "draw", "aether", ""],
      type: "string",
    },
    kind: {
      description: "One toolkit kind. Status effects are not allowed.",
      enum: ["attack", "defend", "draw", "aether", "combo"],
      type: "string",
    },
    text: {
      description: "Rules text the player reads. 8 to 160 characters.",
      type: "string",
    },
  },
  required: ["amount", "chainsFrom", "kind", "text"],
  type: "object",
} as const;

/**
 * OpenAI tools for one playable-card turn.
 * Web search is intentionally absent: flavor comes from `search_lore`.
 */
export const PLAYABLE_CARD_TOOLS: OpenAI.Responses.Tool[] = [
  {
    description:
      "Search inside the ProductNow Lore document for the Reach. Returns only passages from that document. Call this with a specific place, person, order, or event before writing the card. If it returns no passages, call it again with a narrower query.",
    name: SEARCH_LORE_TOOL_NAME,
    parameters: {
      additionalProperties: false,
      properties: {
        query: {
          description:
            "A specific Lore question, such as a floor, a Coreborn bond, the Trials, the Warden Compact, the Sundering, or the Verity.",
          type: "string",
        },
      },
      required: ["query"],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Submit the finished card after search_lore has returned passages. Description must use a concrete detail from those passages. Effects stay inside the combat toolkit.",
    name: SUBMIT_PLAYABLE_CARD_TOOL_NAME,
    parameters: {
      additionalProperties: false,
      properties: {
        aetherCost: {
          description: "Aether spent to play the card, from 1 to 4.",
          type: "integer",
        },
        description: {
          description:
            "Flavor text, 40 to 600 characters, using a name, floor, order, or event from the Lore passages.",
          type: "string",
        },
        effects: {
          description: "One or two effects. Each kind may appear once.",
          items: effectParameters,
          type: "array",
        },
        name: {
          description: "Card name, 2 to 48 characters.",
          type: "string",
        },
        scene: {
          description:
            "What to paint, 16 to 800 characters. Subject and setting only. No letters or card frame.",
          type: "string",
        },
      },
      required: ["aetherCost", "description", "effects", "name", "scene"],
      type: "object",
    },
    strict: false,
    type: "function",
  },
];
