import { join } from "node:path";
import {
  buildPublicAssetUrlPath,
  getPublicAssetsRootPath,
} from "src/library/publicAssetsRoot";

/**
 * Disk and URL locations for one asset class. Every class stores its files in
 * its own folder under the public assets root, so new classes are served
 * without changing the static file setup.
 */
export interface AssetClassStorage {
  /** Folder name under the public assets root, e.g. `card-characters` */
  directoryName: string;
  /**
   * @param segments - Path segments inside this class's folder
   * @returns Absolute path on disk
   */
  filePath: (...segments: string[]) => string;
  /**
   * @param segments - Path segments inside this class's folder
   * @returns Public URL path relative to the backend origin, e.g. `/static/card-characters/…`
   */
  publicPath: (...segments: string[]) => string;
  /**
   * @param backendBaseUrl - Backend origin without a trailing slash
   * @param segments - Path segments inside this class's folder
   * @returns Absolute URL a browser or Phaser can load
   */
  publicUrl: (backendBaseUrl: string, ...segments: string[]) => string;
  /** @returns Absolute path of this class's folder */
  rootPath: () => string;
}

/**
 * Creates the storage helper for an asset class. Paths are resolved on every
 * call so `NODE_ENV` changes in tests are respected.
 * @param directoryName - Folder name under the public assets root
 * @returns Helpers for building disk paths and public URLs inside that folder
 */
export function createAssetClassStorage(
  directoryName: string,
): AssetClassStorage {
  const rootPath = () => join(getPublicAssetsRootPath(), directoryName);
  const publicPath = (...segments: string[]) =>
    buildPublicAssetUrlPath(directoryName, ...segments);

  return {
    directoryName,
    filePath: (...segments) => join(rootPath(), ...segments),
    publicPath,
    publicUrl: (backendBaseUrl, ...segments) =>
      `${backendBaseUrl.replace(/\/$/, "")}${publicPath(...segments)}`,
    rootPath,
  };
}
