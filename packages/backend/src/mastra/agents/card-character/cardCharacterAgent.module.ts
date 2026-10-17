import { Module } from "@nestjs/common";
import { CardCharacterToolService } from "src/asset-classes/card-character/cardCharacterTool.service";
import { MastraCoreModule } from "../../mastraCore.module";
import { CardCharacterAgent } from "./cardCharacterAgent";

/**
 * Wires {@link CardCharacterAgent}. The agent receives `generate-image` from
 * the shared tool registry and stores the portraits it returns.
 * Importers of {@link MastraModule} can inject the agent and call `query`.
 */
@Module({
  exports: [CardCharacterAgent],
  imports: [MastraCoreModule],
  providers: [CardCharacterAgent, CardCharacterToolService],
})
export class CardCharacterAgentModule {}
