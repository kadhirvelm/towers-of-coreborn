import { createAssetClassStorage } from "../shared/assetClassStorage";

/** Each enemy is a folder `public/enemies/<id>/` with one WebP portrait and a manifest. */
export const ENEMY_STORAGE = createAssetClassStorage("enemies");
