import type { AssetClassDefinition } from "./assetClassDefinition";
import { BATTLE_BACKGROUND_ASSET_CLASS } from "./battleBackgroundAssetClass";
import { CARD_CHARACTER_ASSET_CLASS } from "./cardCharacterAssetClass";
import { PLAYABLE_CARD_ASSET_CLASS } from "./playableCardAssetClass";

/** Asset classes shown as tabs in the workshop, in tab order. The first is selected by default. */
export const ASSET_CLASSES: readonly AssetClassDefinition[] = [
  CARD_CHARACTER_ASSET_CLASS,
  BATTLE_BACKGROUND_ASSET_CLASS,
  PLAYABLE_CARD_ASSET_CLASS,
];
