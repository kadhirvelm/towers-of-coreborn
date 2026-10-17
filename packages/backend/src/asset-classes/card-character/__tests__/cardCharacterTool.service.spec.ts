import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { ModelService } from "src/model/model.service";
import { CARD_CHARACTER_IMAGE_CONFIG } from "../cardCharacterSpec";
import { CARD_CHARACTER_STORAGE } from "../cardCharacterStorage";
import {
  type CardCharacterToolOutput,
  CardCharacterToolService,
} from "../cardCharacterTool.service";

const characterInput = {
  identity:
    "A lanky inventor with round brass goggles, a soot smudge, and a patched brown coat.",
  levels: [
    {
      description: "Empty tool belt and hunched shoulders.",
      level: 1,
      title: "Workshop Apprentice",
    },
    {
      description: "A brass gauntlet and one hovering gear.",
      level: 2,
      title: "Gearwright",
    },
    {
      description: "Half-deployed clockwork wings and brass plates.",
      level: 3,
      title: "Wingwright",
    },
    {
      description: "Fully spread filigree wings and a glowing mainspring.",
      level: 4,
      title: "Clockwork Sovereign",
    },
  ],
  sourcePrompt: "a soot-covered inventor who builds clockwork wings",
  theme: "Brass clockwork, soot, and warm lamplight.",
};

describe("CardCharacterToolService", () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), "card-character-tool-"));
  });

  afterEach(async () => {
    await rm(tempDirectory, { force: true, recursive: true });
  });

  test("saves four portraits and reuses level 1 as the reference", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const requestTextCompletion = mock(async (request: unknown) => {
      calls.push(request as Record<string, unknown>);
      return createPortrait(tempDirectory);
    });
    const service = new CardCharacterToolService({
      requestTextCompletion,
    } as unknown as ModelService);
    const before = new Set(await listSetIds());

    const result = (await service
      .createCardCharacterTool()
      .execute?.(characterInput, {} as never)) as
      | CardCharacterToolOutput
      | undefined;

    if (result === undefined) {
      throw new Error("expected the card character tool to return a set");
    }

    expect(result.levels.map((level) => level.level)).toEqual([1, 2, 3, 4]);
    expect(result.levels.map((level) => level.fileName)).toEqual([
      "level-1.png",
      "level-2.png",
      "level-3.png",
      "level-4.png",
    ]);
    expect(result.levels[0]?.publicPath).toBe(
      `/static/card-characters/${result.setId}/level-1.png`,
    );
    expect(requestTextCompletion).toHaveBeenCalledTimes(4);

    const levelOneRequest = calls[0];
    expect(levelOneRequest?.imageConfig).toEqual(CARD_CHARACTER_IMAGE_CONFIG);
    expect(levelOneRequest?.schema).toBe("image");
    expect(levelOneRequest?.inputFiles).toBeUndefined();
    expect(String(levelOneRequest?.prompt)).toContain("facing the viewer");

    for (const request of calls.slice(1)) {
      const inputFiles = request.inputFiles as unknown[] | undefined;
      expect(inputFiles).toHaveLength(1);
      expect(String(request.prompt)).toContain(
        "reference image of this exact character at level 1",
      );
    }

    await rm(result.directoryPath, { force: true, recursive: true });
    const after = await listSetIds();
    for (const name of after) {
      expect(before.has(name)).toBe(true);
    }
  });

  test("removes the set directory when portrait generation fails", async () => {
    const requestTextCompletion = mock(async () => {
      throw new Error("model down");
    });
    const service = new CardCharacterToolService({
      requestTextCompletion,
    } as unknown as ModelService);
    const before = new Set(await listSetIds());

    const errorOrResolved = await service
      .createCardCharacterTool()
      .execute?.(characterInput, {} as never)
      .then(
        () => undefined,
        (caught) => caught as unknown,
      );

    if (errorOrResolved === undefined) {
      throw new Error("expected card character generation to fail");
    }
    const message =
      errorOrResolved instanceof Error
        ? errorOrResolved.message
        : String(errorOrResolved);
    expect(message).toContain("level 1");
    expect(requestTextCompletion).toHaveBeenCalledTimes(2);

    const after = await listSetIds();
    for (const name of after) {
      expect(before.has(name)).toBe(true);
    }
  });
});

/**
 * @returns Directory names currently under the card-character static root
 */
async function listSetIds(): Promise<string[]> {
  const root = CARD_CHARACTER_STORAGE.rootPath();
  try {
    return await readdir(root);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * @param directory - Temp directory for the fake model output
 * @returns Path to a small PNG
 */
async function createPortrait(directory: string) {
  const filePath = join(directory, `${randomUUID()}.png`);
  await sharp({
    create: {
      background: { alpha: 1, b: 80, g: 40, r: 20 },
      channels: 4,
      height: 128,
      width: 96,
    },
  })
    .png()
    .toFile(filePath);
  return filePath;
}
