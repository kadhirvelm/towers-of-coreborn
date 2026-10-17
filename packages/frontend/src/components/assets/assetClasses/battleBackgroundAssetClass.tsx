"use client";

import { BattleBackgroundList } from "../BattleBackgroundList";
import type { AssetClassDefinition } from "./assetClassDefinition";
import { createAssetClassGallery } from "./createAssetClassGallery";

const BattleBackgroundGallery = createAssetClassGallery({
  list: (callers) => callers.battleBackground.list(),
  render: ({ error, isLoading, onDismissJob, pendingJobs, result }) => (
    <BattleBackgroundList
      error={error}
      isLoading={isLoading}
      onDismissJob={onDismissJob}
      pendingJobs={pendingJobs}
      result={result}
    />
  ),
});

export const BATTLE_BACKGROUND_ASSET_CLASS: AssetClassDefinition = {
  dialogDescription:
    "Describe a tower room. We'll paint a wide watercolor backdrop composed for the party, enemies, and card hand.",
  dialogTitle: "Generate Battle Background",
  form: {
    hint: "Generates one 16:9 environment-only room background for a specific battle.",
    placeholder:
      "e.g. a moonlit observatory where jade vines wind through a shattered dome",
    promptLabel: "Describe the battle room",
    submitLabel: "Generate background",
  },
  Gallery: BattleBackgroundGallery,
  generate: (callers, prompt) => callers.battleBackground.generate({ prompt }),
  generateButtonLabel: "+ Generate background",
  id: "battle-backgrounds",
  subtitle: "per-room battle environment generation",
  tabLabel: "Battle backgrounds",
};
