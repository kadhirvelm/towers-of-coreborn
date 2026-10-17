/**
 * Turns a loadout path into a URL Phaser can request.
 * Absolute URLs are returned unchanged. A `/static/...` path is prefixed
 * with the backend origin. Each path segment is encoded once.
 * @param assetUrl - Value pasted into `battleLoadout.ts`
 * @param backendOrigin - Backend origin, with or without a trailing slash
 * @returns A request URL, or `undefined` when the loadout value is blank
 */
export function resolveBattleAssetUrl(
  assetUrl: string,
  backendOrigin: string,
): string | undefined {
  const trimmed = assetUrl.trim();
  if (trimmed === "") {
    return undefined;
  }
  if (hasUrlScheme(trimmed)) {
    return trimmed;
  }

  const origin = backendOrigin.trim().replace(/\/$/, "");
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const encodedPath = withSlash
    .split("/")
    .map((segment) => encodePathSegment(segment))
    .join("/");
  if (origin === "") {
    return encodedPath;
  }
  return `${origin}${encodedPath}`;
}

/**
 * @param value - Candidate URL
 * @returns Whether the value already includes a scheme such as `https:`
 */
function hasUrlScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

/**
 * Encodes one path segment, leaving an already-encoded segment unchanged.
 * @param segment - Path segment that may contain spaces or `%` escapes
 * @returns Encoded segment
 */
function encodePathSegment(segment: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
}
