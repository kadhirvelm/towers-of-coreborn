"use client";

import { DungeonList } from "../DungeonList";
import type {
  AssetClassDefinition,
  AssetGalleryProps,
} from "./assetClassDefinition";
import { BATTLE_BACKGROUND_ASSET_CLASS } from "./battleBackgroundAssetClass";
import { CARD_CHARACTER_ASSET_CLASS } from "./cardCharacterAssetClass";
import { PLAYABLE_CARD_ASSET_CLASS } from "./playableCardAssetClass";

/**
 * Shows dungeon setups created during this workshop session.
 * @param props - Pending jobs and retained generate results
 */
function DungeonGallery({
  onDismissJob,
  onStopJob,
  pendingJobs,
  results,
}: AssetGalleryProps) {
  return (
    <DungeonList
      onDismissJob={onDismissJob}
      onStopJob={onStopJob}
      pendingJobs={pendingJobs}
      results={results}
    />
  );
}

export const DUNGEON_ASSET_CLASS: AssetClassDefinition = {
  cancel: (callers, generationId) => callers.dungeon.cancel({ generationId }),
  dialogDescription:
    "Describe a dungeon. We'll create its battle rooms, characters, and a card for each character.",
  dialogTitle: "Generate Dungeon",
  form: {
    hint: "Needs ProductNow connected. Unless you give different counts, this creates 2 rooms, 3 characters, and 1 card for each character.",
    placeholder: "e.g. a drowned bell tower held by clockwork wardens",
    promptLabel: "Describe the dungeon",
    submitLabel: "Generate dungeon",
  },
  Gallery: DungeonGallery,
  generate: (callers, prompt, generationId) =>
    callers.dungeon.generate({ generationId, prompt }),
  generateButtonLabel: "+ Generate dungeon",
  id: "dungeons",
  refreshClassIds: [
    CARD_CHARACTER_ASSET_CLASS.id,
    BATTLE_BACKGROUND_ASSET_CLASS.id,
    PLAYABLE_CARD_ASSET_CLASS.id,
  ],
  remembersResults: true,
  subtitle: "dungeon setup",
  tabLabel: "Dungeons",
};
