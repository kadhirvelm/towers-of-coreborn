import { createAssetClassModule } from "../shared/createAssetClassModule";
import { EnemyController } from "./enemy.controller";
import { EnemyService } from "./enemy.service";

export const EnemyModule = createAssetClassModule({
  controller: EnemyController,
  providers: [EnemyService],
});
