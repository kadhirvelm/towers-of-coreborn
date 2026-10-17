import { Module } from "@nestjs/common";
import { BattleBackgroundAgentModule } from "./agents/battle-background/battleBackgroundAgent.module";
import { CardCharacterAgentModule } from "./agents/card-character/cardCharacterAgent.module";
import { CardGeneratorAgentModule } from "./agents/card-generator/cardGeneratorAgent.module";
import { MastraCoreModule } from "./mastraCore.module";

/**
 * Mastra runtime and the agents under `src/mastra/agents`.
 * Inject an agent service and call `query`.
 */
@Module({
  exports: [
    MastraCoreModule,
    BattleBackgroundAgentModule,
    CardCharacterAgentModule,
    CardGeneratorAgentModule,
  ],
  imports: [
    MastraCoreModule,
    BattleBackgroundAgentModule,
    CardCharacterAgentModule,
    CardGeneratorAgentModule,
  ],
})
export class MastraModule {}
