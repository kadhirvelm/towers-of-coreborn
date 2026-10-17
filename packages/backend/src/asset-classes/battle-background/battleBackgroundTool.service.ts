import { randomUUID } from "node:crypto";
import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createTool } from "@mastra/core/tools";
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import sharp from "sharp";
import { ModelService } from "src/model/model.service";
import { z } from "zod";
import {
  BATTLE_BACKGROUND_FILE_NAME,
  BATTLE_BACKGROUND_IMAGE_CONFIG,
  BATTLE_BACKGROUND_IMAGE_MODEL,
  BATTLE_BACKGROUND_MANIFEST_FILE_NAME,
  MAX_BATTLE_BACKGROUND_ATTEMPTS,
} from "./battleBackgroundSpec";
import { BATTLE_BACKGROUND_STORAGE } from "./battleBackgroundStorage";
import { buildBattleBackgroundImagePrompt } from "./buildBattleBackgroundImagePrompt";

export const BATTLE_BACKGROUND_TOOL_ID = "create-battle-background";

const battleBackgroundInputSchema = z.object({
  description: z.string().trim().min(20).max(2000),
  sourcePrompt: z.string().trim().min(1).max(4000),
  title: z.string().trim().min(1).max(100),
});

const battleBackgroundOutputSchema = z.object({
  id: z.string(),
  publicPath: z.string(),
});

type BattleBackgroundToolInput = z.infer<typeof battleBackgroundInputSchema>;
export type BattleBackgroundToolOutput = z.infer<
  typeof battleBackgroundOutputSchema
>;

/** Generates and stores one combat-ready tower room background. */
@Injectable()
export class BattleBackgroundToolService {
  private readonly logger = new Logger(BattleBackgroundToolService.name);

  public constructor(private readonly modelService: ModelService) {}

  /**
   * @returns Mastra tool that paints one room from an art-directed brief
   */
  public createBattleBackgroundTool() {
    return createTool({
      description:
        "Paint and save one wide watercolor tower-room background for a card battle.",
      execute: async (input: BattleBackgroundToolInput) =>
        this.generateBackground(input),
      id: BATTLE_BACKGROUND_TOOL_ID,
      inputSchema: battleBackgroundInputSchema,
      outputSchema: battleBackgroundOutputSchema,
    });
  }

  /**
   * @param input - Original request and planned room art
   * @returns Stored background id and public path
   */
  private async generateBackground(
    input: BattleBackgroundToolInput,
  ): Promise<BattleBackgroundToolOutput> {
    const id = randomUUID();
    const directory = BATTLE_BACKGROUND_STORAGE.filePath(id);
    await mkdir(directory, { recursive: true });

    try {
      await this.generateImage(input, directory);
      await writeFile(
        join(directory, BATTLE_BACKGROUND_MANIFEST_FILE_NAME),
        JSON.stringify(
          {
            createdAt: new Date().toISOString(),
            description: input.description,
            id,
            prompt: input.sourcePrompt,
            title: input.title,
          },
          null,
          2,
        ),
      );
      return {
        id,
        publicPath: BATTLE_BACKGROUND_STORAGE.publicPath(
          id,
          BATTLE_BACKGROUND_FILE_NAME,
        ),
      };
    } catch (error) {
      await rm(directory, { force: true, recursive: true });
      throw error;
    }
  }

  /**
   * Generates a valid PNG, retrying a failed model or image response once.
   * @param input - Planned room art
   * @param directory - Destination asset directory
   */
  private async generateImage(
    input: BattleBackgroundToolInput,
    directory: string,
  ): Promise<void> {
    let previousError: unknown;

    for (
      let attempt = 1;
      attempt <= MAX_BATTLE_BACKGROUND_ATTEMPTS;
      attempt += 1
    ) {
      let generatedPath: string | undefined;
      try {
        generatedPath = await this.modelService.requestTextCompletion({
          imageConfig: BATTLE_BACKGROUND_IMAGE_CONFIG,
          model: BATTLE_BACKGROUND_IMAGE_MODEL,
          prompt: buildBattleBackgroundImagePrompt({
            description: input.description,
            previousError: formatOptionalError(previousError),
            title: input.title,
          }),
          schema: "image",
          type: "open-ai",
        });
        const png = await sharp(generatedPath).png().toBuffer();
        const metadata = await sharp(png).metadata();
        if ((metadata.width ?? 0) < 640 || (metadata.height ?? 0) < 360) {
          throw new InternalServerErrorException(
            `Generated background was ${metadata.width ?? 0}x${metadata.height ?? 0}.`,
          );
        }
        await writeFile(join(directory, BATTLE_BACKGROUND_FILE_NAME), png);
        return;
      } catch (error) {
        previousError = error;
        this.logger.warn(
          `Battle background attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        if (generatedPath !== undefined) {
          await unlink(generatedPath).catch(() => undefined);
        }
      }
    }

    throw new InternalServerErrorException(
      `Failed to generate a battle background after ${MAX_BATTLE_BACKGROUND_ATTEMPTS} attempts.`,
    );
  }
}

/**
 * @param error - Previous attempt failure
 * @returns Text for a retry prompt, or undefined before the first attempt
 */
function formatOptionalError(error: unknown): string | undefined {
  if (error == null) {
    return undefined;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
