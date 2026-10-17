import { Module } from "@nestjs/common";
import { ModelModule } from "src/model/model.module";
import { ProductNowMcpModule } from "src/product-now-mcp/product-now-mcp.module";
import { CardGeneratorAgent } from "./cardGeneratorAgent";

/**
 * Wires {@link CardGeneratorAgent}.
 * Importers of {@link MastraModule} can inject the agent and call `query`.
 */
@Module({
  exports: [CardGeneratorAgent],
  imports: [ModelModule, ProductNowMcpModule],
  providers: [CardGeneratorAgent],
})
export class CardGeneratorAgentModule {}
