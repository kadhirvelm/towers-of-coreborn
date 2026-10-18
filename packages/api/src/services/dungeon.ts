import type { Service, ServiceDefinition } from "../genericTypes/service";
import type {
  AssetGenerationPayload,
  BattleBackgroundAsset,
  CancelAssetGenerationPayload,
  CancelAssetGenerationResponse,
  CardCharacterSetAsset,
  PlayableCardAsset,
} from "./assetClasses";

/** One generated character and the cards the coordinator made for them. */
export interface DungeonCharacter {
  cards: PlayableCardAsset[];
  character: CardCharacterSetAsset;
}

/** A complete generated dungeon setup. */
export interface DungeonGeneration {
  backgrounds: BattleBackgroundAsset[];
  characters: DungeonCharacter[];
  /** The coordinator's short description of the generated setup. */
  summary: string;
}

/** Meta-coordinator endpoints for generating a connected dungeon asset set. */
export interface DungeonServiceApi extends Service {
  cancel: {
    payload: CancelAssetGenerationPayload;
    response: CancelAssetGenerationResponse;
  };
  generate: {
    payload: AssetGenerationPayload;
    response: DungeonGeneration;
  };
}

export const DungeonServiceDefinition: ServiceDefinition<DungeonServiceApi> = {
  controller: "dungeons",
  endpoints: {
    cancel: "cancel",
    generate: "generate",
  },
};
