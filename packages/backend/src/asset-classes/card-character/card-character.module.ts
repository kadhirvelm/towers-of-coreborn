import { createAssetClassModule } from "../shared/createAssetClassModule";
import { CardCharacterController } from "./card-character.controller";
import { CardCharacterService } from "./card-character.service";

export const CardCharacterModule = createAssetClassModule({
  controller: CardCharacterController,
  providers: [CardCharacterService],
});
