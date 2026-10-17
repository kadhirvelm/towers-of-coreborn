import { Module } from "@nestjs/common";
import { BattleBackgroundToolService } from "src/asset-classes/battle-background/battleBackgroundTool.service";
import { MastraCoreModule } from "../../mastraCore.module";
import { GenerationAbortModule } from "../generationAbort.module";
import { BattleBackgroundAgent } from "./battleBackgroundAgent";

/**
 * Wires {@link BattleBackgroundAgent}. The agent passes its tool enum to the
 * runner, which loads `consult-productnow` and `generate-image` from the
 * shared registry. The agent stores the painting that tool returns.
 * Importers of {@link MastraModule} can inject the agent and call `query`.
 */
@Module({
  exports: [BattleBackgroundAgent],
  imports: [GenerationAbortModule, MastraCoreModule],
  providers: [BattleBackgroundAgent, BattleBackgroundToolService],
})
export class BattleBackgroundAgentModule {}
