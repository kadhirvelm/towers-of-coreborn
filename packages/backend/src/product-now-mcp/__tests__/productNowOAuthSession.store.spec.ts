import { describe, expect, it } from "bun:test";
import type { ConfigurationService } from "../../configuration/configuration.service";
import type { RedisService } from "../../infra/redis/redis.service";
import { ProductNowOAuthSessionStore } from "../productNowOAuthSession.store";

/**
 * Builds a configuration stub for the session store.
 * @param encryptionKey - Base64 encryption key
 * @returns Configuration service stub
 */
function createConfiguration(encryptionKey: string): ConfigurationService {
  const values: Record<string, string> = {
    MCP_OAUTH_ENCRYPTION_KEY: encryptionKey,
    NODE_ENV: "production",
  };
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigurationService;
}

/**
 * Builds an in-memory Redis stub.
 * @returns Redis stub and its backing values
 */
function createRedis(): { redis: RedisService; values: Map<string, string> } {
  const values = new Map<string, string>();
  const redis = {
    del: async (key: string) => Number(values.delete(key)),
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: string) => {
      values.set(key, value);
      return "OK";
    },
  } as unknown as RedisService;
  return { redis, values };
}

describe("ProductNowOAuthSessionStore", () => {
  it("round-trips encrypted OAuth tokens", async () => {
    const { redis, values } = createRedis();
    const store = new ProductNowOAuthSessionStore(
      createConfiguration(Buffer.alloc(32, 7).toString("base64")),
      redis,
    );

    await store.update("browser-session", () => ({
      tokens: { access_token: "secret-access-token", token_type: "Bearer" },
    }));

    expect((await store.get("browser-session")).tokens?.access_token).toBe(
      "secret-access-token",
    );
    expect([...values.values()].join("")).not.toContain("secret-access-token");
  });

  it("discards a session encrypted with a different key", async () => {
    const { redis, values } = createRedis();
    const writer = new ProductNowOAuthSessionStore(
      createConfiguration(Buffer.alloc(32, 7).toString("base64")),
      redis,
    );
    const reader = new ProductNowOAuthSessionStore(
      createConfiguration(Buffer.alloc(32, 9).toString("base64")),
      redis,
    );

    await writer.update("browser-session", () => ({
      tokens: { access_token: "secret-access-token", token_type: "Bearer" },
    }));

    expect(await reader.get("browser-session")).toEqual({});
    expect(values.size).toBe(0);
  });

  it("rejects encryption keys that are not 32 bytes", () => {
    const { redis } = createRedis();

    expect(
      () =>
        new ProductNowOAuthSessionStore(
          createConfiguration(Buffer.alloc(12).toString("base64")),
          redis,
        ),
    ).toThrow();
  });
});
