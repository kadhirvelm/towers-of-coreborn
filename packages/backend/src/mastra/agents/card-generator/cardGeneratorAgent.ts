import { randomUUID } from "node:crypto";
import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import type { PlayableCardLoreSource } from "@towers-of-coreborn/api";
import type OpenAI from "openai";
import sharp from "sharp";
import { buildPlayableCardImagePrompt } from "src/asset-classes/playable-card/buildPlayableCardImagePrompt";
import { parseLoreSearchResult } from "src/asset-classes/playable-card/parseLoreSearchResult";
import { renderPlayableCardInstructions } from "src/asset-classes/playable-card/playableCardInstructions";
import {
  CARD_GAME_FOLDER_ID,
  MAX_PLAYABLE_CARD_IMAGE_ATTEMPTS,
  MAX_PLAYABLE_CARD_RESEARCH_TURNS,
  PLAYABLE_CARD_IMAGE_CONFIG,
  PLAYABLE_CARD_IMAGE_FILE_NAME,
  PLAYABLE_CARD_IMAGE_MODEL,
  PLAYABLE_CARD_MANIFEST_FILE_NAME,
  PLAYABLE_CARD_TEXT_MODEL,
} from "src/asset-classes/playable-card/playableCardSpec";
import { PLAYABLE_CARD_STORAGE } from "src/asset-classes/playable-card/playableCardStorage";
import {
  PLAYABLE_CARD_TOOLS,
  SEARCH_LORE_TOOL_NAME,
  SUBMIT_PLAYABLE_CARD_TOOL_NAME,
} from "src/asset-classes/playable-card/playableCardTools";
import {
  type PlayableCardDraft,
  validatePlayableCardDraft,
} from "src/asset-classes/playable-card/validatePlayableCardDraft";
import { ModelService } from "src/model/model.service";
import { OpenAIService } from "src/model/openAI.service";
import { ProductNowMcpService } from "src/product-now-mcp/product-now-mcp.service";
import type { QueryableAgent } from "../queryableAgent";

const MIN_IMAGE_EDGE_PX = 64;

/**
 * Input for one card-generator query.
 */
export interface CardGeneratorInput {
  /** What the player asked the card to be about */
  prompt: string;
  /** Browser session that holds the ProductNow OAuth tokens */
  sessionId: string;
}

/**
 * Result of one card-generator query.
 */
export interface CardGeneratorResult {
  /** Folder name of the saved card */
  cardId: string;
}

interface ToolStep {
  draft?: PlayableCardDraft;
  outputs: OpenAI.Responses.ResponseInput;
}

/**
 * Card-generator agent. Call {@link CardGeneratorAgent.query} with a prompt
 * and the browser's ProductNow session. It searches the Lore document, writes
 * one playable card, paints it, and stores the set.
 *
 * @example
 * ```typescript
 * const result = await cardGeneratorAgent.query({
 *   prompt: "a card about the first Coreborn bond",
 *   sessionId,
 * });
 * result.cardId;
 * ```
 */
@Injectable()
export class CardGeneratorAgent
  implements QueryableAgent<CardGeneratorInput, CardGeneratorResult>
{
  private readonly logger = new Logger(CardGeneratorAgent.name);

  public constructor(
    private readonly openAIService: OpenAIService,
    private readonly modelService: ModelService,
    private readonly productNowMcpService: ProductNowMcpService,
  ) {}

  /**
   * Searches Lore, writes the card, paints it, and stores the set.
   * @param input - User prompt and the browser's ProductNow session
   * @returns The saved card id
   * @throws InternalServerErrorException when research or painting fails
   */
  public async query(input: CardGeneratorInput): Promise<CardGeneratorResult> {
    const draft = await this.writeCard(input);
    const cardId = await this.paintAndStore(
      input.prompt,
      draft.draft,
      draft.loreSources,
    );
    return { cardId };
  }

  /**
   * Runs the OpenAI tool loop until a Lore-backed card is submitted.
   * The first turn is required to call `search_lore`.
   * @param input - User prompt and ProductNow session
   * @returns The accepted draft and the passages it was written from
   */
  private async writeCard(input: CardGeneratorInput): Promise<{
    draft: PlayableCardDraft;
    loreSources: PlayableCardLoreSource[];
  }> {
    const loreSources: PlayableCardLoreSource[] = [];
    let response = await this.openAIService.createResponse({
      input: `Create one playable card from this request:\n${input.prompt}`,
      instructions: renderPlayableCardInstructions(),
      model: PLAYABLE_CARD_TEXT_MODEL,
      toolChoice: { name: SEARCH_LORE_TOOL_NAME, type: "function" },
      tools: PLAYABLE_CARD_TOOLS,
    });

    for (let turn = 0; turn < MAX_PLAYABLE_CARD_RESEARCH_TURNS; turn += 1) {
      const step = await this.runToolCalls(
        response.output,
        input.sessionId,
        loreSources,
      );
      if (step.draft !== undefined && loreSources.length > 0) {
        return { draft: step.draft, loreSources };
      }
      if (step.outputs.length === 0) {
        throw new InternalServerErrorException(
          "Playable card generation stopped before a card was submitted.",
        );
      }
      if (turn === MAX_PLAYABLE_CARD_RESEARCH_TURNS - 1) {
        break;
      }

      response = await this.openAIService.createResponse({
        input: step.outputs,
        instructions: renderPlayableCardInstructions(),
        model: PLAYABLE_CARD_TEXT_MODEL,
        previousResponseId: response.id,
        tools: PLAYABLE_CARD_TOOLS,
      });
    }

    throw new InternalServerErrorException(
      "Playable card generation did not submit a Lore-backed card.",
    );
  }

  /**
   * Runs Lore searches before card submission so a submit in the same turn
   * can see the passages just retrieved.
   * @param output - Model output items for this turn
   * @param sessionId - ProductNow browser session
   * @param loreSources - Passages collected across turns
   * @returns Tool outputs and a draft when submission was accepted
   */
  private async runToolCalls(
    output: OpenAI.Responses.ResponseOutputItem[],
    sessionId: string,
    loreSources: PlayableCardLoreSource[],
  ): Promise<ToolStep> {
    const calls = output.filter(isFunctionCall);
    const searches = calls.filter(
      (call) => call.name === SEARCH_LORE_TOOL_NAME,
    );
    const submits = calls.filter(
      (call) => call.name === SUBMIT_PLAYABLE_CARD_TOOL_NAME,
    );
    const others = calls.filter(
      (call) =>
        call.name !== SEARCH_LORE_TOOL_NAME &&
        call.name !== SUBMIT_PLAYABLE_CARD_TOOL_NAME,
    );

    const outputs: OpenAI.Responses.ResponseInputItem[] = [];
    for (const call of searches) {
      outputs.push(await this.searchLore(call, sessionId, loreSources));
    }

    let draft: PlayableCardDraft | undefined;
    for (const call of submits) {
      const submitted = this.submitCard(call, loreSources);
      outputs.push(submitted.output);
      draft = submitted.draft ?? draft;
    }

    for (const call of others) {
      outputs.push(functionOutput(call.call_id, "Unknown tool."));
    }

    return { draft, outputs };
  }

  /**
   * Searches ProductNow and keeps only Lore-document passages.
   * @param call - Model function call
   * @param sessionId - ProductNow browser session
   * @param loreSources - Passages collected so far
   * @returns Tool output describing the passages or a retry instruction
   */
  private async searchLore(
    call: OpenAI.Responses.ResponseFunctionToolCall,
    sessionId: string,
    loreSources: PlayableCardLoreSource[],
  ): Promise<OpenAI.Responses.ResponseInputItem> {
    const query = readSearchQuery(parseToolArguments(call.arguments));
    if (query === undefined) {
      return functionOutput(
        call.call_id,
        "Pass a query of 2 to 400 characters.",
      );
    }

    const raw = await this.productNowMcpService.callTool(sessionId, "search", {
      folderId: CARD_GAME_FOLDER_ID,
      query,
      resultType: "documents",
      searchScope: "workspace",
    });
    const hits = parseLoreSearchResult(raw);
    for (const hit of hits) {
      const alreadyKept = loreSources.some(
        (source) => source.excerpt === hit.excerpt,
      );
      if (!alreadyKept) {
        loreSources.push(hit);
      }
    }
    return functionOutput(call.call_id, formatLoreHits(hits));
  }

  /**
   * Accepts a card only after at least one Lore passage has been retrieved.
   * @param call - Model function call
   * @param loreSources - Passages collected so far
   * @returns Tool output, and the draft when the card is legal
   */
  private submitCard(
    call: OpenAI.Responses.ResponseFunctionToolCall,
    loreSources: PlayableCardLoreSource[],
  ): { draft?: PlayableCardDraft; output: OpenAI.Responses.ResponseInputItem } {
    if (loreSources.length === 0) {
      return {
        output: functionOutput(
          call.call_id,
          "Search the Lore document and use a returned passage before submitting.",
        ),
      };
    }

    const validated = validatePlayableCardDraft(
      parseToolArguments(call.arguments),
    );
    if ("error" in validated) {
      return { output: functionOutput(call.call_id, validated.error) };
    }

    return {
      draft: validated.draft,
      output: functionOutput(call.call_id, "Card accepted."),
    };
  }

  /**
   * Paints the card and writes its manifest.
   * The directory is removed when painting fails.
   * @param prompt - Original user prompt
   * @param draft - Accepted card text
   * @param loreSources - Lore passages used to write it
   * @returns Saved card id
   */
  private async paintAndStore(
    prompt: string,
    draft: PlayableCardDraft,
    loreSources: PlayableCardLoreSource[],
  ): Promise<string> {
    const cardId = randomUUID();
    const directory = PLAYABLE_CARD_STORAGE.filePath(cardId);
    await mkdir(directory, { recursive: true });

    try {
      await this.writeIllustration(directory, draft);
      await this.writeManifest({
        cardId,
        directory,
        draft,
        loreSources,
        prompt,
      });
      return cardId;
    } catch (error) {
      await rm(directory, { force: true, recursive: true });
      throw error;
    }
  }

  /**
   * Asks OpenAI for a portrait and retries when the file is unusable.
   * @param directory - Card directory
   * @param draft - Accepted card, including the scene to paint
   */
  private async writeIllustration(
    directory: string,
    draft: PlayableCardDraft,
  ): Promise<void> {
    let lastError: unknown;
    for (
      let attempt = 1;
      attempt <= MAX_PLAYABLE_CARD_IMAGE_ATTEMPTS;
      attempt += 1
    ) {
      const error = await this.tryWriteIllustration(directory, draft);
      if (error === undefined) {
        return;
      }
      lastError = error;
      this.logger.warn(
        `Playable card image attempt ${attempt} failed: ${formatError(lastError)}`,
      );
    }

    throw new InternalServerErrorException(
      `Failed to paint the playable card after ${MAX_PLAYABLE_CARD_IMAGE_ATTEMPTS} attempts: ${formatError(lastError)}`,
    );
  }

  /**
   * One image attempt. Removes the staged model file either way.
   * @param directory - Card directory
   * @param draft - Accepted card
   * @returns The error from this attempt, or `undefined` when the PNG was saved
   */
  private async tryWriteIllustration(
    directory: string,
    draft: PlayableCardDraft,
  ): Promise<unknown> {
    let generatedPath: string | undefined;
    try {
      generatedPath = await this.modelService.requestTextCompletion({
        imageConfig: PLAYABLE_CARD_IMAGE_CONFIG,
        model: PLAYABLE_CARD_IMAGE_MODEL,
        prompt: buildPlayableCardImagePrompt({
          name: draft.name,
          scene: draft.scene,
        }),
        schema: "image",
        type: "open-ai",
      });
      await persistIllustration(generatedPath, directory);
      return undefined;
    } catch (error) {
      return error;
    } finally {
      if (generatedPath !== undefined) {
        await unlink(generatedPath).catch(() => undefined);
      }
    }
  }

  /**
   * @param params - Card text, Lore passages, and destination
   */
  private async writeManifest(params: {
    cardId: string;
    directory: string;
    draft: PlayableCardDraft;
    loreSources: PlayableCardLoreSource[];
    prompt: string;
  }): Promise<void> {
    const firstEffect = params.draft.effects[0];
    if (firstEffect === undefined) {
      throw new InternalServerErrorException(
        "Playable card generation accepted a card with no effects.",
      );
    }

    const manifest = {
      aetherCost: params.draft.aetherCost,
      cardId: params.cardId,
      createdAt: new Date().toISOString(),
      description: params.draft.description,
      effects: params.draft.effects,
      imageFileName: PLAYABLE_CARD_IMAGE_FILE_NAME,
      kind: firstEffect.kind,
      loreSources: params.loreSources,
      name: params.draft.name,
      prompt: params.prompt,
    };

    await writeFile(
      join(params.directory, PLAYABLE_CARD_MANIFEST_FILE_NAME),
      JSON.stringify(manifest, null, 2),
    );
  }
}

/**
 * Re-encodes a model image as PNG into the card directory.
 * @param generatedPath - Temp path returned by OpenAI
 * @param directory - Card directory
 */
async function persistIllustration(
  generatedPath: string,
  directory: string,
): Promise<void> {
  const png = await sharp(generatedPath).png().toBuffer();
  const metadata = await sharp(png).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < MIN_IMAGE_EDGE_PX || height < MIN_IMAGE_EDGE_PX) {
    throw new InternalServerErrorException(
      `Generated card image was ${width}x${height}, below ${MIN_IMAGE_EDGE_PX}px.`,
    );
  }

  await writeFile(join(directory, PLAYABLE_CARD_IMAGE_FILE_NAME), png);
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

/**
 * @param argumentsJson - JSON string from a function call
 * @returns Parsed JSON, or `undefined` when it is not JSON
 */
function parseToolArguments(argumentsJson: string): unknown {
  try {
    return JSON.parse(argumentsJson) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * @param value - Parsed search-tool arguments
 * @returns A usable query
 */
function readSearchQuery(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.query !== "string") {
    return undefined;
  }
  const query = value.query.trim();
  if (query.length < 2 || query.length > 400) {
    return undefined;
  }
  return query;
}

/**
 * @param item - One Responses output item
 * @returns Whether the item is a function call
 */
function isFunctionCall(
  item: OpenAI.Responses.ResponseOutputItem,
): item is OpenAI.Responses.ResponseFunctionToolCall {
  return item.type === "function_call";
}

/**
 * @param callId - Function call id to answer
 * @param output - Text the model should read next
 * @returns A function-call output item
 */
function functionOutput(
  callId: string,
  output: string,
): OpenAI.Responses.ResponseInputItem {
  return {
    call_id: callId,
    output,
    type: "function_call_output",
  };
}

/**
 * @param value - Unknown JSON value
 * @returns Whether the value is a non-null object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param error - Thrown or returned failure
 * @returns A single-line message
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
