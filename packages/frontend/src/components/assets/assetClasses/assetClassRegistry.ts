import type { AssetClassDefinition } from "./assetClassDefinition";
import { CARD_CHARACTER_ASSET_CLASS } from "./cardCharacterAssetClass";

/** Asset classes shown as tabs in the workshop, in tab order. The first is selected by default. */
export const ASSET_CLASSES: readonly AssetClassDefinition[] = [
  CARD_CHARACTER_ASSET_CLASS,
];
