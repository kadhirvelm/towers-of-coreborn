import { afterEach, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  LORE_DOCUMENT_ID,
  PLAYABLE_CARD_IMAGE_CONFIG,
  PLAYABLE_CARD_IMAGE_MODEL,
} from "src/asset-classes/playable-card/playableCardSpec";
import { PLAYABLE_CARD_STORAGE } from "src/asset-classes/playable-card/playableCardStorage";
import { readPlayableCard } from "src/asset-classes/playable-card/readPlayableCards";
import { ModelService } from "src/model/model.service";
import { OpenAIService } from "src/model/openAI.service";
import { ProductNowMcpService } from "src/product-now-mcp/product-now-mcp.service";
import { CardGeneratorAgent } from "../cardGeneratorAgent";

const loreExcerpt =
  "The earliest recorded Coreborn bond belongs to Licensed Climber Tamsin Korr on floor 4.";

const validCard = {
  aetherCost: 2,
  description:
    "Tamsin Korr weakened a newly condensed Coreborn on floor 4, and the bond held after the Trial window closed.",
  effects: [
    {
      amount: 8,
      chainsFrom: "",
      kind: "attack",
      text: "Deal 8 damage to one enemy.",
    },
  ],
  name: "Korr's First Bond",
  scene: "A climber kneeling beside a condensing spirit of vines on stone.",
};

describe("CardGeneratorAgent", () => {
  const savedCardIds: string[] = [];

  afterEach(async () => {
    for (const cardId of savedCardIds.splice(0)) {
      await rm(PLAYABLE_CARD_STORAGE.filePath(cardId), {
        force: true,
        recursive: true,
      });
    }
  });

  test("searches the Lore document before saving the card and its image", async () => {
    const tempDirectory = await mkdtemp(join(tmpdir(), "playable-card-image-"));
    const responseCalls: Array<Record<string, unknown>> = [];
    const createResponse = mock(async (params: Record<string, unknown>) => {
      responseCalls.push(params);
      if (responseCalls.length === 1) {
        return toolResponse(
          "resp-1",
          "search_lore",
          { query: "Coreborn bond" },
          "call-search",
        );
      }
      return toolResponse(
        "resp-2",
        "submit_playable_card",
        validCard,
        "call-submit",
      );
    });
    const searchArguments: unknown[] = [];
    const callTool = mock(
      async (_sessionId: string, name: string, args: unknown) => {
        expect(name).toBe("search");
        searchArguments.push(args);
        return loreEnvelope();
      },
    );
    const imageRequests: Array<Record<string, unknown>> = [];
    const requestTextCompletion = mock(
      async (request: Record<string, unknown>) => {
        imageRequests.push(request);
        return createPortrait(tempDirectory);
      },
    );

    try {
      const service = new CardGeneratorAgent(
        { createResponse } as unknown as OpenAIService,
        { requestTextCompletion } as unknown as ModelService,
        { callTool } as unknown as ProductNowMcpService,
      );

      const { cardId } = await service.query({
        prompt: "a card about the first Coreborn bond",
        sessionId: "session-1",
      });
      savedCardIds.push(cardId);

      const firstCall = responseCalls[0];
      expect(firstCall?.toolChoice).toEqual({
        name: "search_lore",
        type: "function",
      });
      expect(searchArguments).toEqual([
        {
          folderId: "e12d636b-aaa5-4b8e-b8a9-9a5b3d840dba",
          query: "Coreborn bond",
          resultType: "documents",
          searchScope: "workspace",
        },
      ]);

      const imageRequest = imageRequests[0];
      expect(imageRequest?.type).toBe("open-ai");
      expect(imageRequest?.schema).toBe("image");
      expect(imageRequest?.model).toBe(PLAYABLE_CARD_IMAGE_MODEL);
      expect(imageRequest?.imageConfig).toEqual(PLAYABLE_CARD_IMAGE_CONFIG);
      expect(String(imageRequest?.prompt)).toContain("Watercolor on paper");

      const card = await readPlayableCard(
        PLAYABLE_CARD_STORAGE.rootPath(),
        cardId,
        "https://backend.test/static/playable-cards",
      );
      expect(card?.name).toBe("Korr's First Bond");
      expect(card?.aetherCost).toBe(2);
      expect(card?.effects[0]?.text).toBe("Deal 8 damage to one enemy.");
      expect(card?.loreSources[0]?.excerpt).toBe(loreExcerpt);
      expect(card?.imageUrl).toBe(
        `https://backend.test/static/playable-cards/${cardId}/card.png`,
      );
    } finally {
      await rm(tempDirectory, { force: true, recursive: true });
    }
  });

  test("rejects a card submitted before any Lore passage matches", async () => {
    const tempDirectory = await mkdtemp(join(tmpdir(), "playable-card-retry-"));
    let searches = 0;
    const responseCalls: Array<Record<string, unknown>> = [];
    const createResponse = mock(async (params: Record<string, unknown>) => {
      responseCalls.push(params);
      if (responseCalls.length === 1) {
        return toolResponse(
          "resp-1",
          "search_lore",
          { query: "cards" },
          "call-search-1",
        );
      }
      if (responseCalls.length === 2) {
        return toolResponse(
          "resp-2",
          "submit_playable_card",
          validCard,
          "call-early",
        );
      }
      if (responseCalls.length === 3) {
        return toolResponse(
          "resp-3",
          "search_lore",
          { query: "Tamsin Korr Coreborn" },
          "call-search-2",
        );
      }
      return toolResponse(
        "resp-4",
        "submit_playable_card",
        validCard,
        "call-submit",
      );
    });
    const callTool = mock(async () => {
      searches += 1;
      if (searches === 1) {
        return { sources: [] };
      }
      return loreEnvelope();
    });
    const requestTextCompletion = mock(async () =>
      createPortrait(tempDirectory),
    );

    try {
      const service = new CardGeneratorAgent(
        { createResponse } as unknown as OpenAIService,
        { requestTextCompletion } as unknown as ModelService,
        { callTool } as unknown as ProductNowMcpService,
      );
      const { cardId } = await service.query({
        prompt: "a card about Tamsin Korr",
        sessionId: "session-1",
      });
      savedCardIds.push(cardId);

      const retryInput = JSON.stringify(responseCalls[2]?.input);
      expect(retryInput).toContain(
        "Search the Lore document and use a returned passage before submitting.",
      );
      expect(callTool).toHaveBeenCalledTimes(2);
      expect(requestTextCompletion).toHaveBeenCalledTimes(1);
    } finally {
      await rm(tempDirectory, { force: true, recursive: true });
    }
  });

  test("removes the card directory when painting fails", async () => {
    const responseCalls: unknown[] = [];
    const createResponse = mock(async () => {
      responseCalls.push(responseCalls.length);
      if (responseCalls.length === 1) {
        return toolResponse(
          "resp-1",
          "search_lore",
          { query: "Coreborn" },
          "call-search",
        );
      }
      return toolResponse(
        "resp-2",
        "submit_playable_card",
        validCard,
        "call-submit",
      );
    });
    const requestTextCompletion = mock(async () => {
      throw new Error("image model down");
    });
    const service = new CardGeneratorAgent(
      { createResponse } as unknown as OpenAIService,
      { requestTextCompletion } as unknown as ModelService,
      {
        callTool: mock(async () => loreEnvelope()),
      } as unknown as ProductNowMcpService,
    );
    const before = new Set(await listCardIds());

    const error = await service
      .query({ prompt: "a Coreborn card", sessionId: "session-1" })
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );

    if (!(error instanceof Error)) {
      throw new Error("expected painting to fail");
    }
    expect(error.message).toContain("paint");
    expect(requestTextCompletion).toHaveBeenCalledTimes(2);
    const after = await listCardIds();
    for (const cardId of after) {
      expect(before.has(cardId)).toBe(true);
    }
  });
});

/**
 * @returns Directory names currently under the playable-card static root
 */
async function listCardIds(): Promise<string[]> {
  try {
    return await readdir(PLAYABLE_CARD_STORAGE.rootPath());
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * @param id - Response id
 * @param name - Tool name
 * @param args - Tool arguments
 * @param callId - Function call id
 * @returns A one-call Responses payload
 */
function toolResponse(id: string, name: string, args: unknown, callId: string) {
  return {
    id,
    output: [
      {
        arguments: JSON.stringify(args),
        call_id: callId,
        name,
        type: "function_call",
      },
    ],
  };
}

/**
 * @returns A ProductNow search envelope that includes one Lore passage and one design-doc passage
 */
function loreEnvelope() {
  return {
    content: [
      {
        text: JSON.stringify({
          sources: [
            {
              document: {
                documentId: "4d910971-c925-497c-b7b7-f2a269367289",
              },
              excerpts: [{ content: "Status effects are cut from scope." }],
              title: "Towers of Coreborn",
              url: "https://app.productnow.ai/design",
            },
            {
              document: { documentId: LORE_DOCUMENT_ID, name: "Lore" },
              excerpts: [{ content: loreExcerpt }],
              title: "Lore",
              url: "https://app.productnow.ai/lore",
            },
          ],
        }),
        type: "text",
      },
    ],
  };
}

/**
 * @param directory - Temp directory for the fake model output
 * @returns Path to a small PNG
 */
async function createPortrait(directory: string) {
  const filePath = join(directory, `${randomUUID()}.png`);
  await sharp({
    create: {
      background: { alpha: 1, b: 80, g: 120, r: 40 },
      channels: 4,
      height: 128,
      width: 96,
    },
  })
    .png()
    .toFile(filePath);
  return filePath;
}
