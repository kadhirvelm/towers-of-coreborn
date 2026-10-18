import { Module } from "@nestjs/common";
import { MastraCoreModule } from "../../mastraCore.module";
import { BattleBackgroundAgentModule } from "../battle-background/battleBackgroundAgent.module";
import { CardCharacterAgentModule } from "../card-character/cardCharacterAgent.module";
import { CardGeneratorAgentModule } from "../card-generator/cardGeneratorAgent.module";
import { GenerationAbortModule } from "../generationAbort.module";
import { DungeonCoordinatorAgent } from "./dungeonCoordinatorAgent";

/** Wires the dungeon meta-agent to the three existing asset agents. */
@Module({
  exports: [DungeonCoordinatorAgent],
  imports: [
    BattleBackgroundAgentModule,
    CardCharacterAgentModule,
    CardGeneratorAgentModule,
    GenerationAbortModule,
    MastraCoreModule,
  ],
  providers: [DungeonCoordinatorAgent],
})
export class DungeonCoordinatorAgentModule {}
