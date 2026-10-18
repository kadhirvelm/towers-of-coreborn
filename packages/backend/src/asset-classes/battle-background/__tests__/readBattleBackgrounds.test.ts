import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import {
  BATTLE_BACKGROUND_FILE_NAME,
  BATTLE_BACKGROUND_MANIFEST_FILE_NAME,
} from "../battleBackgroundSpec";
import { BATTLE_BACKGROUND_STORAGE } from "../battleBackgroundStorage";
import {
  readBattleBackground,
  readBattleBackgrounds,
} from "../readBattleBackgrounds";

const ASSET_ID = "background-reader-test";

describe("readBattleBackgrounds", () => {
  afterEach(async () => {
    await rm(BATTLE_BACKGROUND_STORAGE.filePath(ASSET_ID), {
      force: true,
      recursive: true,
    });
  });

  test("reads a complete asset with its public image URL", async () => {
    await writeFixture();

    const asset = await readBattleBackground(
      BATTLE_BACKGROUND_STORAGE.rootPath(),
      ASSET_ID,
      "https://backend.test/static/battle-backgrounds",
    );

    expect(asset?.title).toBe("Moon Gate Terrace");
    expect(asset?.imageUrl).toBe(
      `https://backend.test/static/battle-backgrounds/${ASSET_ID}/background.webp`,
    );
  });

  test("skips an asset whose image is missing", async () => {
    await writeFixture();
    await rm(
      BATTLE_BACKGROUND_STORAGE.filePath(ASSET_ID, BATTLE_BACKGROUND_FILE_NAME),
    );

    const assets = await readBattleBackgrounds(
      BATTLE_BACKGROUND_STORAGE.rootPath(),
      "https://backend.test/static/battle-backgrounds",
    );

    expect(assets.some((asset) => asset.id === ASSET_ID)).toBe(false);
  });
});

/** Writes one complete battle-background fixture. */
async function writeFixture(): Promise<void> {
  const directory = BATTLE_BACKGROUND_STORAGE.filePath(ASSET_ID);
  await mkdir(directory, { recursive: true });
  await writeFile(
    BATTLE_BACKGROUND_STORAGE.filePath(
      ASSET_ID,
      BATTLE_BACKGROUND_MANIFEST_FILE_NAME,
    ),
    JSON.stringify({
      createdAt: "2026-01-01T00:00:00.000Z",
      description: "A broken moon gate above a quiet jade garden.",
      id: ASSET_ID,
      prompt: "a moonlit observatory",
      title: "Moon Gate Terrace",
    }),
  );
  await writeFile(
    BATTLE_BACKGROUND_STORAGE.filePath(ASSET_ID, BATTLE_BACKGROUND_FILE_NAME),
    "png",
  );
}
