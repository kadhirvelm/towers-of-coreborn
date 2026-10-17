import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import sharp from "sharp";
import { deleteImageFiles } from "src/mastra/tools/generateImageTool.service";
import {
  CARD_CHARACTER_MANIFEST_FILE_NAME,
  type CardCharacterLevelNumber,
  cardCharacterLevelFileName,
  isCardCharacterLevelNumber,
} from "./cardCharacterSpec";
import { CARD_CHARACTER_STORAGE } from "./cardCharacterStorage";
import type { CardCharacterImageSet } from "./readCardCharacterImageSet";

const MIN_PORTRAIT_EDGE_PX = 64;

interface SavedLevel {
  description: string;
  fileName: string;
  level: CardCharacterLevelNumber;
  title: string;
}

/**
 * Stores the four portraits returned by the generate-image tool.
 */
@Injectable()
export class CardCharacterToolService {
  /**
   * Copies a generate-image result into a card-character set and writes its manifest.
   * Temp files from the image tool are removed after the copy, including when saving fails.
   * @param params - Portraits from the tool and the user's original prompt
   * @returns The saved set id
   * @throws InternalServerErrorException when a portrait is unusable
   */
  public async saveGeneratedPortraits(params: {
    portraits: CardCharacterImageSet;
    sourcePrompt: string;
  }): Promise<{ setId: string }> {
    const setId = randomUUID();
    const setDirectory = CARD_CHARACTER_STORAGE.filePath(setId);
    const tempPaths = params.portraits.images.map((image) => image.filePath);
    await mkdir(setDirectory, { recursive: true });

    try {
      const levels = await this.persistPortraits(
        params.portraits,
        setDirectory,
      );
      await this.writeManifest({
        levels,
        setDirectory,
        setId,
        sourcePrompt: params.sourcePrompt,
        theme: params.portraits.theme,
      });
      return { setId };
    } catch (error) {
      await rm(setDirectory, { force: true, recursive: true });
      throw error;
    } finally {
      await deleteImageFiles(tempPaths);
    }
  }

  /**
   * @param portraits - Four generated portraits, weakest first
   * @param setDirectory - Destination directory
   * @returns Saved level metadata in level order
   */
  private async persistPortraits(
    portraits: CardCharacterImageSet,
    setDirectory: string,
  ): Promise<SavedLevel[]> {
    const saved: SavedLevel[] = [];

    for (const [index, portrait] of portraits.images.entries()) {
      const levelNumber = index + 1;
      if (!isCardCharacterLevelNumber(levelNumber)) {
        throw new InternalServerErrorException(
          "Card character generation requires levels 1, 2, 3, and 4.",
        );
      }
      saved.push(
        await this.persistPortrait({
          description: portrait.notes,
          filePath: portrait.filePath,
          level: levelNumber,
          setDirectory,
          title: portrait.name,
        }),
      );
    }

    return saved;
  }

  /**
   * Re-encodes one model image as PNG into the set directory.
   * @param params - Source file, stage, and destination
   * @returns Saved portrait metadata
   */
  private async persistPortrait(params: {
    description: string;
    filePath: string;
    level: CardCharacterLevelNumber;
    setDirectory: string;
    title: string;
  }): Promise<SavedLevel> {
    const png = await sharp(params.filePath).png().toBuffer();
    const metadata = await sharp(png).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width < MIN_PORTRAIT_EDGE_PX || height < MIN_PORTRAIT_EDGE_PX) {
      throw new InternalServerErrorException(
        `Generated portrait was ${width}x${height}, below ${MIN_PORTRAIT_EDGE_PX}px.`,
      );
    }

    const fileName = cardCharacterLevelFileName(params.level);
    await writeFile(join(params.setDirectory, fileName), png);

    return {
      description: params.description,
      fileName,
      level: params.level,
      title: params.title,
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
}
