import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { orderCardCharacterLevels } from "../cardCharacterSpec";
import {
  readCardCharacterSet,
  readCardCharacterSets,
} from "../readCardCharacterSets";

describe("orderCardCharacterLevels", () => {
  test("returns levels 1 through 4 in order", () => {
    const ordered = orderCardCharacterLevels([
      { level: 3 as const, title: "c" },
      { level: 1 as const, title: "a" },
      { level: 4 as const, title: "d" },
      { level: 2 as const, title: "b" },
    ]);

    expect(ordered?.map((level) => level.title)).toEqual(["a", "b", "c", "d"]);
  });

  test("rejects a missing stage", () => {
    const ordered = orderCardCharacterLevels([
      { level: 1 as const },
      { level: 1 as const },
      { level: 2 as const },
      { level: 3 as const },
    ]);

    expect(ordered).toBeUndefined();
  });
});

describe("readCardCharacterSets", () => {
  test("returns newest complete sets and skips invalid directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "card-characters-"));

    try {
      await writeSet(root, "older-set", "2026-01-01T00:00:00.000Z", true);
      await writeSet(root, "newer-set", "2026-06-01T00:00:00.000Z", true);
      await writeSet(root, "broken-set", "2026-07-01T00:00:00.000Z", false);
      await mkdir(join(root, "notes-only"));

      const sets = await readCardCharacterSets(
        root,
        "https://backend.test/static/card-characters",
      );

      expect(sets.map((set) => set.setId)).toEqual(["newer-set", "older-set"]);
      expect(sets[0]?.levels.map((level) => level.level)).toEqual([1, 2, 3, 4]);
      expect(sets[0]?.levels[0]?.url).toBe(
        "https://backend.test/static/card-characters/newer-set/level-1.webp",
      );
      expect(sets[0]?.prompt).toBe("a clockwork inventor");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  test("reads one set and skips a set whose portraits are missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "card-character-set-"));

    try {
      await writeSet(root, "complete", "2026-01-01T00:00:00.000Z", true);
      await writeSet(root, "broken", "2026-02-01T00:00:00.000Z", false);

      const complete = await readCardCharacterSet(
        root,
        "complete",
        "https://backend.test/static/card-characters",
      );
      const broken = await readCardCharacterSet(
        root,
        "broken",
        "https://backend.test/static/card-characters",
      );

      expect(complete?.setId).toBe("complete");
      expect(complete?.levels).toHaveLength(4);
      expect(broken).toBeUndefined();
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  test("returns an empty list when the directory does not exist", async () => {
    const sets = await readCardCharacterSets(
      join(tmpdir(), "missing-card-characters-root"),
      "https://backend.test/static/card-characters",
    );

    expect(sets).toEqual([]);
  });
});

/**
 * Writes a four-level fixture, optionally omitting a portrait so the reader skips it.
 * @param root - Temp card-character root
 * @param setId - Directory name
 * @param createdAt - Manifest timestamp
 * @param includePortraits - Whether to write the four portrait placeholders
 */
async function writeSet(
  root: string,
  setId: string,
  createdAt: string,
  includePortraits: boolean,
) {
  const setDirectory = join(root, setId);
  await mkdir(setDirectory);

  const levels = [1, 2, 3, 4].map((level) => ({
    description: `Stage ${level} grows stronger.`,
    fileName: `level-${level}.webp`,
    level,
    title: `Stage ${level}`,
  }));

  await writeFile(
    join(setDirectory, "manifest.json"),
    JSON.stringify({
      createdAt,
      levels,
      prompt: "a clockwork inventor",
      setId,
      theme: "brass and soot",
    }),
  );

  if (!includePortraits) {
    return;
  }

  for (const level of levels) {
    await writeFile(join(setDirectory, level.fileName), "png");
  }
}
