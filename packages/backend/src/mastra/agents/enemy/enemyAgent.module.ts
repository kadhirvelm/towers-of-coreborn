import { Module } from "@nestjs/common";
import { EnemyToolService } from "src/asset-classes/enemy/enemyTool.service";
import { MastraCoreModule } from "../../mastraCore.module";
import { GenerationAbortModule } from "../generationAbort.module";
import { EnemyAgent } from "./enemyAgent";

/**
 * Wires {@link EnemyAgent}. The agent passes its tool enum to the runner,
 * which loads `consult-productnow` and `generate-image` from the shared
 * registry. The agent stores the portrait that tool returns.
 * Importers of {@link MastraModule} can inject the agent and call `query`.
 */
@Module({
  exports: [EnemyAgent],
  imports: [GenerationAbortModule, MastraCoreModule],
  providers: [EnemyAgent, EnemyToolService],
})
export class EnemyAgentModule {}
