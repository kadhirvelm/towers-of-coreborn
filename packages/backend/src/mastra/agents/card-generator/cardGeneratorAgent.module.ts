import { Module } from "@nestjs/common";
import { ProductNowMcpModule } from "src/product-now-mcp/product-now-mcp.module";
import { MastraCoreModule } from "../../mastraCore.module";
import { GenerationAbortModule } from "../generationAbort.module";
import { CardGeneratorAgent } from "./cardGeneratorAgent";

/**
 * Wires {@link CardGeneratorAgent}. The agent loads `consult-productnow` and
 * `generate-image` from the shared registry and builds Lore search tools for
 * the browser session.
 * Importers of {@link MastraModule} can inject the agent and call `query`.
 */
@Module({
  exports: [CardGeneratorAgent],
  imports: [GenerationAbortModule, MastraCoreModule, ProductNowMcpModule],
  providers: [CardGeneratorAgent],
})
export class CardGeneratorAgentModule {}
