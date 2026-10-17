import { createAssetClassStorage } from "../shared/assetClassStorage";

/** Each playable card is a folder `public/playable-cards/<cardId>/` with one PNG and a manifest. */
export const PLAYABLE_CARD_STORAGE = createAssetClassStorage("playable-cards");
