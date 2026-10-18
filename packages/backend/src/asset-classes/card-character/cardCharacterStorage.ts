import { createAssetClassStorage } from "../shared/assetClassStorage";

/** Each card-character set is a folder `public/card-characters/<setId>/` with four WebP portraits and a manifest. */
export const CARD_CHARACTER_STORAGE =
  createAssetClassStorage("card-characters");
