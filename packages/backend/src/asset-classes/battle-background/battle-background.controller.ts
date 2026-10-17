import { BattleBackgroundServiceDefinition } from "@towers-of-coreborn/api";
import { createAssetClassController } from "../shared/createAssetClassController";
import { BattleBackgroundService } from "./battle-background.service";

/** `generate` and `list` endpoints for battle-room backgrounds. */
export const BattleBackgroundController = createAssetClassController(
  BattleBackgroundServiceDefinition,
  BattleBackgroundService,
);
