import { createAssetClassModule } from "../shared/createAssetClassModule";
import { PlayableCardController } from "./playable-card.controller";
import { PlayableCardService } from "./playable-card.service";

export const PlayableCardModule = createAssetClassModule({
  controller: PlayableCardController,
  providers: [PlayableCardService],
});
