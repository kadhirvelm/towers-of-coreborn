import type { ServiceDefinition } from "../../genericTypes/service";
import {
  ASSET_CLASS_ENDPOINTS,
  type AssetClassServiceApi,
} from "./assetClassService";

/** One generated room backdrop ready for the battle scene. */
export interface BattleBackgroundAsset {
  /** Art-director description used to paint the room. */
  description: string;
  /** When this asset was generated. */
  createdAt: string;
  /** Stable folder id under `/static/battle-backgrounds`. */
  id: string;
  /** Absolute URL clients can use as a background image. */
  imageUrl: string;
  /** Original room request from the user. */
  prompt: string;
  /** Short display name for the room. */
  title: string;
}

export interface ListBattleBackgroundsResponse {
  /** Newest backgrounds first. */
  backgrounds: BattleBackgroundAsset[];
}

/** Battle backgrounds: one prompt becomes one wide, combat-ready room image. */
export type BattleBackgroundServiceApi = AssetClassServiceApi<
  BattleBackgroundAsset,
  ListBattleBackgroundsResponse
>;

export const BattleBackgroundServiceDefinition: ServiceDefinition<BattleBackgroundServiceApi> =
  {
    controller: "battle-backgrounds",
    endpoints: ASSET_CLASS_ENDPOINTS,
  };
