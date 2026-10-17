/**
 * Constructs request headers with an Authorization bearer token.
 * @param getAccessToken - Function to get the current access token
 * @param additionalHeaders - Optional additional headers to include
 * @param tokenOverride - If provided, uses this token instead of calling getAccessToken
 * @returns Headers object with Authorization, Content-Type, and any additional headers
 */
export async function constructHeaders(
  getAccessToken: () => Promise<string>,
  additionalHeaders?: Record<string, string>,
  tokenOverride?: string,
): Promise<HeadersInit> {
  const token = tokenOverride ?? (await getAccessToken());

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...additionalHeaders,
  };
}
