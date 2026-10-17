import { Module } from "@nestjs/common";
import { CardCharacterToolService } from "src/asset-classes/card-character/cardCharacterTool.service";
import { MastraCoreModule } from "../../mastraCore.module";
import { GenerationAbortModule } from "../generationAbort.module";
import { CardCharacterAgent } from "./cardCharacterAgent";

/**
 * Wires {@link CardCharacterAgent}. The agent passes its tool enum to the
 * runner, which loads `generate-image` from the shared registry. The agent
 * stores the portraits that tool returns.
 * Importers of {@link MastraModule} can inject the agent and call `query`.
 */
@Module({
  exports: [CardCharacterAgent],
  imports: [GenerationAbortModule, MastraCoreModule],
  providers: [CardCharacterAgent, CardCharacterToolService],
})
export class CardCharacterAgentModule {}
