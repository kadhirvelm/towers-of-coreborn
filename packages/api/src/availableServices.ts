import type { ServiceDefinition } from "./genericTypes/service";
import {
  BattleBackgroundServiceApi,
  BattleBackgroundServiceDefinition,
  CardCharacterServiceApi,
  CardCharacterServiceDefinition,
  EnemyServiceApi,
  EnemyServiceDefinition,
  PlayableCardServiceApi,
  PlayableCardServiceDefinition,
} from "./services/assetClasses";
import {
  DungeonServiceApi,
  DungeonServiceDefinition,
} from "./services/dungeon";
import {
  ProductNowMcpServiceApi,
  ProductNowMcpServiceDefinition,
} from "./services/productNowMcp";

export type AvailableServices = {
  battleBackground: BattleBackgroundServiceApi;
  cardCharacter: CardCharacterServiceApi;
  dungeon: DungeonServiceApi;
  enemy: EnemyServiceApi;
  playableCard: PlayableCardServiceApi;
  productNowMcp: ProductNowMcpServiceApi;
};

export type AvailableServicesDefinition = {
  [key in keyof AvailableServices]: ServiceDefinition<AvailableServices[key]>;
};

export const AVAILABLE_SERVICES: AvailableServicesDefinition = {
  battleBackground: BattleBackgroundServiceDefinition,
  cardCharacter: CardCharacterServiceDefinition,
  dungeon: DungeonServiceDefinition,
  enemy: EnemyServiceDefinition,
  playableCard: PlayableCardServiceDefinition,
  productNowMcp: ProductNowMcpServiceDefinition,
};
