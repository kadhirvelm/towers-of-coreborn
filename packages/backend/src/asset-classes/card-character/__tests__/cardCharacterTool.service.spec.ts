import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { access, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { CARD_CHARACTER_STORAGE } from "../cardCharacterStorage";
import { CardCharacterToolService } from "../cardCharacterTool.service";
import type { CardCharacterImageSet } from "../readCardCharacterImageSet";

describe("CardCharacterToolService", () => {
  const savedSetIds: string[] = [];
  let tempDirectory = "";

  afterEach(async () => {
    for (const setId of savedSetIds.splice(0)) {
      await rm(CARD_CHARACTER_STORAGE.filePath(setId), {
        force: true,
        recursive: true,
      });
    }
    if (tempDirectory !== "") {
      await rm(tempDirectory, { force: true, recursive: true });
      tempDirectory = "";
    }
  });

  test("saves four portraits and removes the temp files", async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), "card-character-save-"));
    const portraits = await portraitSet(tempDirectory, 96, 128);
    const service = new CardCharacterToolService();

    const { setId } = await service.saveGeneratedPortraits({
      portraits,
      sourcePrompt: "a soot-covered inventor who builds clockwork wings",
    });
    savedSetIds.push(setId);

    const manifest = JSON.parse(
      await readFile(
        join(CARD_CHARACTER_STORAGE.filePath(setId), "manifest.json"),
        "utf8",
      ),
    ) as {
      levels: Array<{ fileName: string; level: number; title: string }>;
      prompt: string;
      theme: string;
    };
    expect(manifest.prompt).toBe(
      "a soot-covered inventor who builds clockwork wings",
    );
    expect(manifest.theme).toBe("Brass clockwork and soot.");
    expect(manifest.levels.map((level) => level.level)).toEqual([1, 2, 3, 4]);
    expect(manifest.levels.map((level) => level.fileName)).toEqual([
      "level-1.png",
      "level-2.png",
      "level-3.png",
      "level-4.png",
    ]);
    expect(manifest.levels[0]?.title).toBe("Workshop Apprentice");
    expect(await fileExists(portraits.images[0].filePath)).toBe(false);
  });

  test("removes the set directory when a portrait is unusable", async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), "card-character-fail-"));
    const portraits = await portraitSet(tempDirectory, 8, 8);
    const service = new CardCharacterToolService();
    const before = new Set(await listSetIds());

    const error = await service
      .saveGeneratedPortraits({
        portraits,
        sourcePrompt: "a knight",
      })
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );

    if (!(error instanceof Error)) {
      throw new Error("expected saving to fail");
    }
    expect(error.message).toContain("below 64px");
    const after = await listSetIds();
    for (const name of after) {
      expect(before.has(name)).toBe(true);
    }
    expect(await fileExists(portraits.images[0].filePath)).toBe(false);
  });
});

/**
 * @param directory - Temp directory for the source portraits
 * @param width - Portrait width
 * @param height - Portrait height
 * @returns A generate-image result the saver can store
 */
async function portraitSet(
  directory: string,
  width: number,
  height: number,
): Promise<CardCharacterImageSet> {
  const titles = [
    "Workshop Apprentice",
    "Gearwright",
    "Wingwright",
    "Clockwork Sovereign",
  ];
  const images: Array<{ filePath: string; name: string; notes: string }> = [];
  for (const [index, title] of titles.entries()) {
    const filePath = join(directory, `${randomUUID()}.png`);
    await sharp({
      create: {
        background: { alpha: 1, b: 80, g: 40, r: 20 },
        channels: 4,
        height,
        width,
      },
    })
      .png()
      .toFile(filePath);
    images.push({
      filePath,
      name: title ?? "Stage",
      notes: `Stage ${index + 1} changes gear and stance.`,
    });
  }

  const [first, second, third, fourth] = images;
  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined
  ) {
    throw new Error("expected four portraits");
  }

  return {
    images: [first, second, third, fourth],
    theme: "Brass clockwork and soot.",
  };
}

/**
 * @returns Directory names currently under the card-character static root
 */
async function listSetIds(): Promise<string[]> {
  try {
    return await readdir(CARD_CHARACTER_STORAGE.rootPath());
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * @param filePath - Path that may have been deleted
 * @returns Whether the file is still on disk
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
