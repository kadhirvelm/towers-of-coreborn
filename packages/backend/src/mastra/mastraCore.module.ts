import { Module } from "@nestjs/common";
import { ModelModule } from "src/model/model.module";
import { ProductNowMcpModule } from "src/product-now-mcp/product-now-mcp.module";
import { ConsultProductNowAgent } from "./agents/consult-productnow/consultProductNowAgent";
import { TowersOfCorebornAgentService } from "./shared/towersOfCorebornAgent.service";
import { TowersOfCorebornAgentToolRegistry } from "./shared/towersOfCorebornAgentToolRegistry";
import { GenerateImageToolService } from "./tools/generateImageTool.service";

/**
 * Shared Mastra runtime: the agent runner and the tool catalog.
 * Agent modules import this; {@link MastraModule} re-exports it with each agent.
 */
@Module({
  exports: [
    ConsultProductNowAgent,
    TowersOfCorebornAgentService,
    TowersOfCorebornAgentToolRegistry,
  ],
  imports: [ModelModule, ProductNowMcpModule],
  providers: [
    ConsultProductNowAgent,
    GenerateImageToolService,
    TowersOfCorebornAgentService,
    TowersOfCorebornAgentToolRegistry,
  ],
})
export class MastraCoreModule {}
