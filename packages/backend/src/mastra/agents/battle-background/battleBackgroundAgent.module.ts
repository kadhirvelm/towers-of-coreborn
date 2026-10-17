import { Module } from "@nestjs/common";
import { BattleBackgroundToolService } from "src/asset-classes/battle-background/battleBackgroundTool.service";
import { ModelModule } from "src/model/model.module";
import { MastraCoreModule } from "../../mastraCore.module";
import { BattleBackgroundAgent } from "./battleBackgroundAgent";

/**
 * Wires {@link BattleBackgroundAgent} and the image-generation tool it calls.
 * Importers of {@link MastraModule} can inject the agent and call `query`.
 */
@Module({
  exports: [BattleBackgroundAgent],
  imports: [MastraCoreModule, ModelModule],
  providers: [BattleBackgroundAgent, BattleBackgroundToolService],
})
export class BattleBackgroundAgentModule {}
