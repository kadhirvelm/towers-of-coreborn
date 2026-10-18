import type { Dirent } from "node:fs";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DUNGEON_SLOT_KINDS,
  DUNGEON_SLOT_STATUSES,
  type DungeonBlueprint,
  type DungeonSlot,
  type DungeonSlotPreview,
  type DungeonSlotStatus,
} from "@towers-of-coreborn/api";
import { z } from "zod";
import { DUNGEON_FILE_NAME } from "./dungeonStorage";

const slotFields = {
  assetId: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  generationId: z.string().min(1).optional(),
  id: z.string().min(1),
  prompt: z.string().min(1),
  status: z.enum(DUNGEON_SLOT_STATUSES),
  title: z.string().min(1),
} as const;

const slotSchema = z.discriminatedUnion("kind", [
  z.object({ ...slotFields, kind: z.literal(DUNGEON_SLOT_KINDS[0]) }),
  z.object({ ...slotFields, kind: z.literal(DUNGEON_SLOT_KINDS[1]) }),
  z.object({ ...slotFields, kind: z.literal(DUNGEON_SLOT_KINDS[2]) }),
  z.object({
    ...slotFields,
    characterSlotId: z.string().min(1),
    kind: z.literal(DUNGEON_SLOT_KINDS[3]),
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  }),
]);

const blueprintSchema = z.object({
  createdAt: z.string().min(1),
  id: z.string().min(1),
  prompt: z.string().min(1),
  slots: z.array(slotSchema),
  summary: z.string(),
});

/** Package JSON before preview images and the public file URL are added. */
export type StoredDungeonBlueprint = z.infer<typeof blueprintSchema>;

/** One slot as it is written to the package file. */
export type StoredDungeonSlot = z.infer<typeof slotSchema>;

/** Fields a slot update may change. Cleared fields are removed from the file. */
export interface DungeonSlotUpdate {
  assetId?: string;
  clearAssetId?: boolean;
  clearError?: boolean;
  clearGenerationId?: boolean;
  error?: string;
  generationId?: string;
  status?: DungeonSlotStatus;
}

/**
 * Reads every readable dungeon package, newest first.
 * A missing folder or a file that is not a package is skipped.
 * @param rootPath - Dungeon storage root
 * @returns Stored packages without preview images
 */
export async function readStoredDungeonBlueprints(
  rootPath: string,
): Promise<StoredDungeonBlueprint[]> {
  const entries = await readEntries(rootPath);
  const blueprints = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => readStoredDungeonBlueprint(rootPath, entry.name)),
  );
  return blueprints
    .filter(
      (blueprint): blueprint is StoredDungeonBlueprint =>
        blueprint !== undefined,
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

/**
 * Reads one package file.
 * @param rootPath - Dungeon storage root
 * @param id - Package folder name
 * @returns The package, or undefined when the file is missing or invalid
 */
export async function readStoredDungeonBlueprint(
  rootPath: string,
  id: string,
): Promise<StoredDungeonBlueprint | undefined> {
  try {
    const text = await readFile(blueprintPath(rootPath, id), "utf8");
    const parsed = blueprintSchema.safeParse(JSON.parse(text));
    if (!parsed.success || parsed.data.id !== id) {
      return undefined;
    }
    return parsed.data;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Writes a package atomically so a reader never sees a partial file.
 * @param rootPath - Dungeon storage root
 * @param blueprint - Package to store. Preview fields are omitted.
 */
export async function writeStoredDungeonBlueprint(
  rootPath: string,
  blueprint: StoredDungeonBlueprint,
): Promise<void> {
  const directory = join(rootPath, blueprint.id);
  await mkdir(directory, { recursive: true });
  const target = blueprintPath(rootPath, blueprint.id);
  const temporary = join(directory, `${DUNGEON_FILE_NAME}.tmp`);
  await writeFile(temporary, `${JSON.stringify(blueprint, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

/**
 * Applies one slot update. Clearing a field removes it from the stored object.
 * @param slot - Slot currently in the file
 * @param update - Fields to change
 * @returns The slot to write back
 */
export function applyDungeonSlotUpdate(
  slot: StoredDungeonSlot,
  update: DungeonSlotUpdate,
): StoredDungeonSlot {
  const next: StoredDungeonSlot = { ...slot };
  if (update.status !== undefined) {
    next.status = update.status;
  }
  if (update.assetId !== undefined) {
    next.assetId = update.assetId;
  }
  if (update.clearAssetId === true) {
    delete next.assetId;
  }
  if (update.generationId !== undefined) {
    next.generationId = update.generationId;
  }
  if (update.clearGenerationId === true) {
    delete next.generationId;
  }
  if (update.error !== undefined) {
    next.error = update.error;
  }
  if (update.clearError === true) {
    delete next.error;
  }
  return next;
}

/**
 * Adds the public file URL and any resolved previews.
 * @param blueprint - Package read from disk
 * @param jsonUrl - Absolute URL of the package file
 * @param previews - Preview by slot id. Missing ids stay without a preview.
 * @returns The blueprint returned by the API
 */
export function toDungeonBlueprint(
  blueprint: StoredDungeonBlueprint,
  jsonUrl: string,
  previews: ReadonlyMap<string, DungeonSlotPreview>,
): DungeonBlueprint {
  return {
    ...blueprint,
    jsonUrl,
    slots: blueprint.slots.map((slot) =>
      toDungeonSlot(slot, previews.get(slot.id)),
    ),
  };
}

/**
 * @param slot - Stored slot
 * @param preview - Resolved image, when the linked asset exists
 * @returns The slot returned by the API
 */
function toDungeonSlot(
  slot: StoredDungeonSlot,
  preview: DungeonSlotPreview | undefined,
): DungeonSlot {
  if (preview === undefined) {
    return slot;
  }
  return { ...slot, preview };
}

/**
 * @param rootPath - Dungeon storage root
 * @param id - Package folder name
 * @returns Absolute path of the package file
 */
function blueprintPath(rootPath: string, id: string): string {
  return join(rootPath, id, DUNGEON_FILE_NAME);
}

/**
 * @param rootPath - Directory that may not exist yet
 * @returns Directory entries, or an empty list when the root is missing
 */
async function readEntries(rootPath: string): Promise<Dirent[]> {
  try {
    return await readdir(rootPath, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
