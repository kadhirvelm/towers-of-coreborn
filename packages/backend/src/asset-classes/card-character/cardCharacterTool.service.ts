import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createTool } from "@mastra/core/tools";
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import sharp from "sharp";
import { ModelService } from "src/model/model.service";
import type { InputFile } from "src/model/types/modelRequestTypes";
import { z } from "zod";
import {
  buildCardCharacterImagePrompt,
  type CardCharacterLevelBrief,
} from "./cardCharacterImagePrompt";
import {
  CARD_CHARACTER_IMAGE_CONFIG,
  CARD_CHARACTER_IMAGE_MODEL,
  CARD_CHARACTER_MANIFEST_FILE_NAME,
  type CardCharacterLevelNumber,
  cardCharacterLevelFileName,
  isCardCharacterLevelNumber,
  MAX_CARD_CHARACTER_LEVEL_ATTEMPTS,
  orderCardCharacterLevels,
} from "./cardCharacterSpec";
import { CARD_CHARACTER_STORAGE } from "./cardCharacterStorage";

/** Name the coordinator agent calls the card-character tool by. */
export const CARD_CHARACTER_TOOL_ID = "create-card-character";

const MIN_PORTRAIT_EDGE_PX = 64;

const levelInputSchema = z.object({
  description: z
    .string()
    .trim()
    .min(8)
    .max(800)
    .describe(
      "What changes at this power stage: gear, posture, and effects. Keep the same person.",
    ),
  level: z
    .number()
    .int()
    .min(1)
    .max(4)
    .describe("1 is weakest, 4 is strongest."),
  title: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .describe("Short stage name in the user's theme, not 'Level 1'."),
});

const cardCharacterInputSchema = z.object({
  identity: z
    .string()
    .trim()
    .min(8)
    .max(1200)
    .describe(
      "Locked visual identity shared by all four portraits: species, face, age, build, and signature clothing. Do not put power effects here.",
    ),
  levels: z
    .array(levelInputSchema)
    .length(4)
    .describe("Exactly four stages, levels 1 through 4, weakest to strongest."),
  sourcePrompt: z
    .string()
    .trim()
    .min(1)
    .max(4000)
    .describe("The user's original character prompt, copied unchanged."),
  theme: z
    .string()
    .trim()
    .min(4)
    .max(600)
    .describe(
      "Visual theme taken from the user: palette, motifs, materials, and rendering style.",
    ),
});

const savedLevelSchema = z.object({
  description: z.string(),
  fileName: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  publicPath: z.string(),
  title: z.string(),
});

const cardCharacterOutputSchema = z.object({
  directoryPath: z.string(),
  levels: z.array(savedLevelSchema).length(4),
  setId: z.string(),
});

type CardCharacterToolInput = z.infer<typeof cardCharacterInputSchema>;
export type CardCharacterToolOutput = z.infer<typeof cardCharacterOutputSchema>;

interface SavedLevel {
  description: string;
  fileName: string;
  filePath: string;
  level: CardCharacterLevelNumber;
  publicPath: string;
  title: string;
}

/**
 * Generates four facing-viewer portraits of one card-game character.
 * Level 1 establishes the face. Levels 2–4 reuse that portrait as a reference
 * so the person stays stable while power increases.
 */
@Injectable()
export class CardCharacterToolService {
  private readonly logger = new Logger(CardCharacterToolService.name);

  public constructor(private readonly modelService: ModelService) {}

  /**
   * Mastra tool the card-character coordinator calls once per user prompt.
   * @returns A tool that plans nothing itself and paints the four stages it is given
   */
  public createCardCharacterTool() {
    return createTool({
      description:
        "Generate four portraits of one character facing the viewer, from weakest (level 1) to strongest (level 4). Identity and theme stay locked. Saves a set of four images.",
      execute: async (input: CardCharacterToolInput) => {
        return this.generateCardCharacter(input);
      },
      id: CARD_CHARACTER_TOOL_ID,
      inputSchema: cardCharacterInputSchema,
      outputSchema: cardCharacterOutputSchema,
    });
  }

  /**
   * Paints and stores one four-level character set.
   * @param input - Identity, theme, original prompt, and four stage briefs
   * @returns Saved set id, directory, and public paths
   */
  private async generateCardCharacter(
    input: CardCharacterToolInput,
  ): Promise<CardCharacterToolOutput> {
    const levels = this.requireOrderedLevels(input.levels);
    const setId = randomUUID();
    const setDirectory = CARD_CHARACTER_STORAGE.filePath(setId);
    await mkdir(setDirectory, { recursive: true });

    try {
      const levelOneBrief = levels[0];
      if (levelOneBrief === undefined) {
        throw new InternalServerErrorException(
          "Card character generation requires a level 1 portrait.",
        );
      }

      const levelOne = await this.generateLevel({
        identity: input.identity,
        level: levelOneBrief,
        setDirectory,
        setId,
        theme: input.theme,
      });
      const reference = await this.readReferenceImage(levelOne.filePath);
      const remaining = await Promise.all(
        levels.slice(1).map((level) =>
          this.generateLevel({
            identity: input.identity,
            level,
            reference,
            setDirectory,
            setId,
            theme: input.theme,
          }),
        ),
      );
      const savedLevels = [levelOne, ...remaining];
      await this.writeManifest({
        levels: savedLevels,
        setDirectory,
        setId,
        sourcePrompt: input.sourcePrompt,
        theme: input.theme,
      });

      return {
        directoryPath: setDirectory,
        levels: savedLevels.map((level) => ({
          description: level.description,
          fileName: level.fileName,
          level: level.level,
          publicPath: level.publicPath,
          title: level.title,
        })),
        setId,
      };
    } catch (error) {
      await rm(setDirectory, { force: true, recursive: true });
      throw error;
    }
  }

  /**
   * @param levels - Tool input levels, already length-checked by zod
   * @returns Levels 1–4 in order
   */
  private requireOrderedLevels(
    levels: CardCharacterToolInput["levels"],
  ): CardCharacterLevelBrief[] {
    const briefs: CardCharacterLevelBrief[] = [];

    for (const level of levels) {
      if (!isCardCharacterLevelNumber(level.level)) {
        throw new InternalServerErrorException(
          "Card character generation requires levels 1, 2, 3, and 4.",
        );
      }
      briefs.push({
        description: level.description,
        level: level.level,
        title: level.title,
      });
    }

    const ordered = orderCardCharacterLevels(briefs);
    if (ordered === undefined) {
      throw new InternalServerErrorException(
        "Card character generation requires levels 1, 2, 3, and 4 exactly once.",
      );
    }

    return ordered;
  }

  /**
   * Generates one portrait, retrying when the file is unusable.
   * @param params - Stage brief and optional level-1 reference
   * @returns The saved portrait
   */
  private async generateLevel(params: {
    identity: string;
    level: CardCharacterLevelBrief;
    reference?: InputFile;
    setDirectory: string;
    setId: string;
    theme: string;
  }): Promise<SavedLevel> {
    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= MAX_CARD_CHARACTER_LEVEL_ATTEMPTS;
      attempt += 1
    ) {
      const attemptResult = await this.tryGenerateLevel(params, lastError);
      if (attemptResult.saved !== undefined) {
        return attemptResult.saved;
      }
      lastError = attemptResult.error;
      this.logger.warn(
        `Card character level ${params.level.level} attempt ${attempt} failed: ${this.formatError(lastError)}`,
      );
    }

    throw new InternalServerErrorException(
      `Failed to generate card character level ${params.level.level} after ${MAX_CARD_CHARACTER_LEVEL_ATTEMPTS} attempts: ${this.formatError(lastError)}`,
    );
  }

  /**
   * One image-model attempt for a single level.
   * @param params - Stage brief and optional reference
   * @param previousError - Failure from the prior attempt
   * @returns The saved portrait, or the error from this attempt
   */
  private async tryGenerateLevel(
    params: {
      identity: string;
      level: CardCharacterLevelBrief;
      reference?: InputFile;
      setDirectory: string;
      setId: string;
      theme: string;
    },
    previousError: unknown,
  ): Promise<{ error?: unknown; saved?: SavedLevel }> {
    let generatedPath: string | undefined;

    try {
      generatedPath = await this.requestPortrait(params, previousError);
      const saved = await this.persistPortrait(generatedPath, params);
      return { saved };
    } catch (error) {
      return { error };
    } finally {
      if (generatedPath !== undefined) {
        await unlink(generatedPath).catch(() => undefined);
      }
    }
  }

  /**
   * @param params - Stage brief and optional reference image
   * @param previousError - Failure to include when retrying
   * @returns Temp file path returned by the image model
   */
  private async requestPortrait(
    params: {
      identity: string;
      level: CardCharacterLevelBrief;
      reference?: InputFile;
      theme: string;
    },
    previousError: unknown,
  ): Promise<string> {
    const previousErrorText =
      previousError === undefined ? undefined : this.formatError(previousError);

    return this.modelService.requestTextCompletion({
      imageConfig: CARD_CHARACTER_IMAGE_CONFIG,
      ...(params.reference === undefined
        ? {}
        : { inputFiles: [params.reference] }),
      model: CARD_CHARACTER_IMAGE_MODEL,
      prompt: buildCardCharacterImagePrompt({
        hasReferenceImage: params.reference !== undefined,
        identity: params.identity,
        level: params.level,
        previousError: previousErrorText,
        theme: params.theme,
      }),
      schema: "image",
      temperature: 0.4,
      type: "gemini",
    });
  }

  /**
   * Re-encodes a model image as PNG into the set directory.
   * @param generatedPath - Temp path returned by Gemini
   * @param params - Destination set and level
   * @returns Saved portrait metadata
   */
  private async persistPortrait(
    generatedPath: string,
    params: {
      level: CardCharacterLevelBrief;
      setDirectory: string;
      setId: string;
    },
  ): Promise<SavedLevel> {
    const png = await sharp(generatedPath).png().toBuffer();
    const metadata = await sharp(png).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width < MIN_PORTRAIT_EDGE_PX || height < MIN_PORTRAIT_EDGE_PX) {
      throw new InternalServerErrorException(
        `Generated portrait was ${width}x${height}, below ${MIN_PORTRAIT_EDGE_PX}px.`,
      );
    }

    const fileName = cardCharacterLevelFileName(params.level.level);
    const filePath = join(params.setDirectory, fileName);
    await writeFile(filePath, png);

    return {
      description: params.level.description,
      fileName,
      filePath,
      level: params.level.level,
      publicPath: CARD_CHARACTER_STORAGE.publicPath(params.setId, fileName),
      title: params.level.title,
    };
  }

  /**
   * @param filePath - Saved level-1 PNG
   * @returns Inline image the later levels should match
   */
  private async readReferenceImage(filePath: string): Promise<InputFile> {
    const bytes = await readFile(filePath);
    return {
      base64: bytes.toString("base64"),
      description:
        "Reference portrait of this exact character at level 1. Preserve the face, species, age, and costume identity.",
      mimeType: "image/png",
    };
  }

  /**
   * @param params - Completed portraits and the prompt that produced them
   */
  private async writeManifest(params: {
    levels: SavedLevel[];
    setDirectory: string;
    setId: string;
    sourcePrompt: string;
    theme: string;
  }): Promise<void> {
    const manifest = {
      createdAt: new Date().toISOString(),
      levels: params.levels.map((level) => ({
        description: level.description,
        fileName: level.fileName,
        level: level.level,
        title: level.title,
      })),
      prompt: params.sourcePrompt,
      setId: params.setId,
      theme: params.theme,
    };

    await writeFile(
      join(params.setDirectory, CARD_CHARACTER_MANIFEST_FILE_NAME),
      JSON.stringify(manifest, null, 2),
    );
  }

  /**
   * @param error - Thrown value from a model or file call
   * @returns A single-line message
   */
  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
