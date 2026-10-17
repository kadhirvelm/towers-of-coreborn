import { isServiceError, type ServiceError } from "@towers-of-coreborn/api";

export { isServiceError };

interface RetryWithTokenRefreshSuccess {
  response: Response;
}

/**
 * Runs a request and retries it once with a refreshed token when the API returns 401.
 */
export async function retryWithTokenRefresh(
  makeRequest: (tokenOverride?: string) => Promise<Response>,
  onRefreshAccessToken: () => Promise<string | null>,
  onUnauthenticated: () => void,
  path: string,
): Promise<RetryWithTokenRefreshSuccess | ServiceError> {
  const response = await makeRequest();

  if (response.status !== 401) {
    return { response };
  }

  const refreshedToken = await onRefreshAccessToken();

  if (refreshedToken == null) {
    onUnauthenticated();

    return {
      code: 401,
      message: "Unauthorized - please sign in again",
      path,
      type: "error",
    };
  }

  const retryResponse = await makeRequest(refreshedToken);

  if (retryResponse.status !== 401) {
    return { response: retryResponse };
  }

  onUnauthenticated();

  return {
    code: 401,
    message: "Unauthorized - please sign in again",
    path,
    type: "error",
  };
}
