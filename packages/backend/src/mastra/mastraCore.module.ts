import { Module } from "@nestjs/common";
import { ModelModule } from "src/model/model.module";
import { TowersOfCorebornAgentService } from "./shared/towersOfCorebornAgent.service";
import { TowersOfCorebornAgentToolRegistry } from "./shared/towersOfCorebornAgentToolRegistry";
import { GenerateImageToolService } from "./tools/generateImageTool.service";

/**
 * Shared Mastra runtime: the agent runner and the tool catalog.
 * Agent modules import this; {@link MastraModule} re-exports it with each agent.
 */
@Module({
  exports: [TowersOfCorebornAgentService, TowersOfCorebornAgentToolRegistry],
  imports: [ModelModule],
  providers: [
    GenerateImageToolService,
    TowersOfCorebornAgentService,
    TowersOfCorebornAgentToolRegistry,
  ],
})
export class MastraCoreModule {}
