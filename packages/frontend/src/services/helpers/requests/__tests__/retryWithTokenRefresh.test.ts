import { describe, expect, test } from "bun:test";
import { retryWithTokenRefresh } from "../retryWithTokenRefresh";

/**
 * @param message - JSON error message
 * @returns A 401 response with a service-error body
 */
function unauthorizedResponse(message: string): Response {
  return new Response(JSON.stringify({ message }), { status: 401 });
}

describe("retryWithTokenRefresh", () => {
  test("keeps the server message when a retry stays unauthorized", async () => {
    const result = await retryWithTokenRefresh(
      async () => unauthorizedResponse("Connect ProductNow first"),
      async () => "token",
      () => undefined,
      "/playable-cards/generate",
    );

    expect(result).toEqual({
      code: 401,
      message: "Connect ProductNow first",
      path: "/playable-cards/generate",
      type: "error",
    });
  });

  test("uses the sign-in message when a 401 body cannot be read", async () => {
    const result = await retryWithTokenRefresh(
      async () => new Response("nope", { status: 401 }),
      async () => null,
      () => undefined,
      "/playable-cards/generate",
    );

    expect(result).toEqual({
      code: 401,
      message: "Unauthorized - please sign in again",
      path: "/playable-cards/generate",
      type: "error",
    });
  });
});
