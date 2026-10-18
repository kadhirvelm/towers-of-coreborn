import type { BattleLoadout } from "./battleLoadout";
import { resolveBattleAssetUrl } from "./resolveBattleAssetUrl";

/** Texture key for the player portrait. */
export const PLAYER_IMAGE_KEY = "battle-player";

/** Texture key for the enemy portrait. */
export const ENEMY_IMAGE_KEY = "battle-enemy";

/** One file the battle scene queues in Phaser's loader. */
export interface BattleAssetRequest {
  key: string;
  kind: "image" | "json";
  url: string;
}

/**
 * Texture key for one card illustration.
 * @param cardId - Loadout id, stable when the card moves between deck and hand
 * @returns Cache key unique to that card's image
 */
export function cardImageKey(cardId: string): string {
  return `battle-card-image-${cardId}`;
}

/**
 * Cache key for one card's `manifest.json`.
 * @param cardId - Loadout id
 * @returns Cache key unique to that card's rules file
 */
export function cardManifestKey(cardId: string): string {
  return `battle-card-manifest-${cardId}`;
}

/**
 * Lists the images and JSON files named in the loadout.
 * Blank URLs are skipped, so an empty loadout queues nothing.
 * @param loadout - Hardcoded battle assets
 * @param backendOrigin - Backend origin used to resolve `/static/...` paths
 * @returns Loader requests in player, enemy, hand, then deck order
 */
export function listBattleAssetRequests(
  loadout: BattleLoadout,
  backendOrigin = process.env.NEXT_PUBLIC_API_CLIENT_URL ?? "",
): BattleAssetRequest[] {
  const requests: BattleAssetRequest[] = [];
  pushImage(requests, PLAYER_IMAGE_KEY, loadout.player.imageUrl, backendOrigin);
  pushImage(requests, ENEMY_IMAGE_KEY, loadout.enemy.imageUrl, backendOrigin);

  for (const card of [...loadout.cards, ...loadout.deck]) {
    pushImage(requests, cardImageKey(card.id), card.imageUrl, backendOrigin);
    pushJson(
      requests,
      cardManifestKey(card.id),
      card.manifestUrl,
      backendOrigin,
    );
  }

  return requests;
}

/**
 * @param requests - Queue being built
 * @param key - Texture key
 * @param assetUrl - Loadout image URL
 * @param backendOrigin - Backend origin
 */
function pushImage(
  requests: BattleAssetRequest[],
  key: string,
  assetUrl: string,
  backendOrigin: string,
): void {
  const url = resolveBattleAssetUrl(assetUrl, backendOrigin);
  if (url === undefined) {
    return;
  }
  requests.push({ key, kind: "image", url });
}

/**
 * @param requests - Queue being built
 * @param key - JSON cache key
 * @param assetUrl - Loadout manifest URL
 * @param backendOrigin - Backend origin
 */
function pushJson(
  requests: BattleAssetRequest[],
  key: string,
  assetUrl: string,
  backendOrigin: string,
): void {
  const url = resolveBattleAssetUrl(assetUrl, backendOrigin);
  if (url === undefined) {
    return;
  }
  requests.push({ key, kind: "json", url });
}
