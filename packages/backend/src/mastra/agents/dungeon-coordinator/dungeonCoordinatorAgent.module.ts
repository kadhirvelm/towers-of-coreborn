import { Module } from "@nestjs/common";
import { MastraCoreModule } from "../../mastraCore.module";
import { GenerationAbortModule } from "../generationAbort.module";
import { DungeonCoordinatorAgent } from "./dungeonCoordinatorAgent";

/**
 * Wires the dungeon planner. It records prompts for the other asset agents
 * and does not call them. Slot generation lives on the dungeon service.
 */
@Module({
  exports: [DungeonCoordinatorAgent],
  imports: [GenerationAbortModule, MastraCoreModule],
  providers: [DungeonCoordinatorAgent],
})
export class DungeonCoordinatorAgentModule {}
