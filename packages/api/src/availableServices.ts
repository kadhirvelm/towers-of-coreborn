import type { ServiceDefinition } from "./genericTypes/service";
import {
  CardCharacterServiceApi,
  CardCharacterServiceDefinition,
} from "./services/assetClasses";

export type AvailableServices = {
  cardCharacter: CardCharacterServiceApi;
};

export type AvailableServicesDefinition = {
  [key in keyof AvailableServices]: ServiceDefinition<AvailableServices[key]>;
};

export const AVAILABLE_SERVICES: AvailableServicesDefinition = {
  cardCharacter: CardCharacterServiceDefinition,
};
