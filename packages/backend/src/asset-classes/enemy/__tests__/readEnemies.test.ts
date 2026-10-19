import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { ENEMY_FILE_NAME, ENEMY_MANIFEST_FILE_NAME } from "../enemySpec";
import { ENEMY_STORAGE } from "../enemyStorage";
import { readEnemies, readEnemy } from "../readEnemies";

const ASSET_ID = "enemy-reader-test";

describe("readEnemies", () => {
  afterEach(async () => {
    await rm(ENEMY_STORAGE.filePath(ASSET_ID), {
      force: true,
      recursive: true,
    });
  });

  test("reads a complete enemy with its public portrait URL", async () => {
    await writeFixture();

    const asset = await readEnemy(
      ENEMY_STORAGE.rootPath(),
      ASSET_ID,
      "https://backend.test/static/enemies",
    );

    expect(asset?.title).toBe("Moss Antler");
    expect(asset?.maxHitPoints).toBe(42);
    expect(asset?.pattern).toEqual([
      {
        amount: 6,
        kind: "attack",
        text: "Deal 6 damage to the player.",
      },
      { amount: 8, kind: "defend", text: "Gain 8 block." },
    ]);
    expect(asset?.imageUrl).toBe(
      `https://backend.test/static/enemies/${ASSET_ID}/enemy.webp`,
    );
  });

  test("keeps an older enemy that has no attack cycle", async () => {
    await writeFixture();
    const manifestPath = ENEMY_STORAGE.filePath(
      ASSET_ID,
      ENEMY_MANIFEST_FILE_NAME,
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      pattern?: unknown;
    };
    delete manifest.pattern;
    await writeFile(manifestPath, JSON.stringify(manifest));

    const asset = await readEnemy(
      ENEMY_STORAGE.rootPath(),
      ASSET_ID,
      "https://backend.test/static/enemies",
    );

    expect(asset?.title).toBe("Moss Antler");
    expect(asset?.pattern).toEqual([]);
  });

  test("skips an enemy whose portrait is missing", async () => {
    await writeFixture();
    await rm(ENEMY_STORAGE.filePath(ASSET_ID, ENEMY_FILE_NAME));

    const enemies = await readEnemies(
      ENEMY_STORAGE.rootPath(),
      "https://backend.test/static/enemies",
    );

    expect(enemies.some((enemy) => enemy.id === ASSET_ID)).toBe(false);
  });
});

/** Writes one complete enemy fixture. */
async function writeFixture(): Promise<void> {
  const directory = ENEMY_STORAGE.filePath(ASSET_ID);
  await mkdir(directory, { recursive: true });
  await writeFile(
    ENEMY_STORAGE.filePath(ASSET_ID, ENEMY_MANIFEST_FILE_NAME),
    JSON.stringify({
      createdAt: "2026-01-01T00:00:00.000Z",
      description: "A feral Coreborn with moss-covered antlers.",
      id: ASSET_ID,
      maxHitPoints: 42,
      pattern: [
        {
          amount: 6,
          kind: "attack",
          text: "Deal 6 damage to the player.",
        },
        { amount: 8, kind: "defend", text: "Gain 8 block." },
      ],
      prompt: "a feral Coreborn",
      title: "Moss Antler",
    }),
  );
  await writeFile(ENEMY_STORAGE.filePath(ASSET_ID, ENEMY_FILE_NAME), "png");
}
