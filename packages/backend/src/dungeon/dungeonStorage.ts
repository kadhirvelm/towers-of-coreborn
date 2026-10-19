import { createAssetClassStorage } from "src/asset-classes/shared/assetClassStorage";

/** Dungeon packages live under `public/dungeons/<id>/dungeon.json`. */
export const DUNGEON_STORAGE = createAssetClassStorage("dungeons");

/** Nest token for the dungeon package folder. Tests can supply another folder. */
export const DUNGEON_STORAGE_TOKEN = "DUNGEON_STORAGE";

/** File name of a dungeon package inside its folder. */
export const DUNGEON_FILE_NAME = "dungeon.json";
