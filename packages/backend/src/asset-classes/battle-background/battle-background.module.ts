import { createAssetClassModule } from "../shared/createAssetClassModule";
import { BattleBackgroundController } from "./battle-background.controller";
import { BattleBackgroundService } from "./battle-background.service";

export const BattleBackgroundModule = createAssetClassModule({
  controller: BattleBackgroundController,
  providers: [BattleBackgroundService],
});
