import { createAssetClassModule } from "../shared/createAssetClassModule";
import { CardCharacterController } from "./card-character.controller";
import { CardCharacterService } from "./card-character.service";
import { CardCharacterGenerationAgentService } from "./cardCharacterAgent.service";
import { CardCharacterToolService } from "./cardCharacterTool.service";

export const CardCharacterModule = createAssetClassModule({
  controller: CardCharacterController,
  providers: [
    CardCharacterService,
    CardCharacterGenerationAgentService,
    CardCharacterToolService,
  ],
});
