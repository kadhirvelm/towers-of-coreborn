import { describe, expect, it } from "bun:test";
import type { ConfigurationService } from "../../configuration/configuration.service";
import type { PrismaService } from "../../database/prisma.service";
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

/** One encrypted session row in the in-memory stub. */
interface SessionRow {
  connected: boolean;
  payload: string;
  updatedAt: number;
}

/**
 * Builds an in-memory Prisma stub for the session table.
 * @returns Prisma stub and its backing rows
 */
function createPrisma(): {
  prisma: PrismaService;
  rows: Map<string, SessionRow>;
} {
  const rows = new Map<string, SessionRow>();
  let clock = 0;
  const prisma = {
    client: {
      productNowOAuthSession: {
        deleteMany: async ({ where }: { where: { id: string } }) => {
          return { count: Number(rows.delete(where.id)) };
        },
        findFirst: async ({ where }: { where: { connected: boolean } }) => {
          const matches = [...rows.entries()]
            .filter(([, row]) => row.connected === where.connected)
            .sort(([, left], [, right]) => right.updatedAt - left.updatedAt);
          const match = matches[0];
          if (!match) {
            return null;
          }
          return { id: match[0], ...match[1] };
        },
        findUnique: async ({ where }: { where: { id: string } }) => {
          const row = rows.get(where.id);
          if (row === undefined) {
            return null;
          }
          return { id: where.id, payload: row.payload };
        },
        upsert: async ({
          create,
          update,
          where,
        }: {
          create: { connected: boolean; id: string; payload: string };
          update: { connected: boolean; payload: string };
          where: { id: string };
        }) => {
          clock += 1;
          const next = rows.has(where.id)
            ? {
                connected: update.connected,
                payload: update.payload,
                updatedAt: clock,
              }
            : {
                connected: create.connected,
                payload: create.payload,
                updatedAt: clock,
              };
          rows.set(where.id, next);
          return { id: where.id, payload: next.payload };
        },
      },
    },
  } as unknown as PrismaService;
  return { prisma, rows };
}

describe("ProductNowOAuthSessionStore", () => {
  it("round-trips encrypted OAuth tokens", async () => {
    const { prisma, rows } = createPrisma();
    const store = new ProductNowOAuthSessionStore(
      createConfiguration(Buffer.alloc(32, 7).toString("base64")),
      prisma,
    );

    await store.update("browser-session", () => ({
      tokens: { access_token: "secret-access-token", token_type: "Bearer" },
    }));

    expect((await store.get("browser-session")).tokens?.access_token).toBe(
      "secret-access-token",
    );
    expect([...rows.values()].map((row) => row.payload).join("")).not.toContain(
      "secret-access-token",
    );
    expect(await store.findLatestConnectedSessionId()).toBe("browser-session");
  });

  it("discards a session encrypted with a different key", async () => {
    const { prisma, rows } = createPrisma();
    const writer = new ProductNowOAuthSessionStore(
      createConfiguration(Buffer.alloc(32, 7).toString("base64")),
      prisma,
    );
    const reader = new ProductNowOAuthSessionStore(
      createConfiguration(Buffer.alloc(32, 9).toString("base64")),
      prisma,
    );

    await writer.update("browser-session", () => ({
      tokens: { access_token: "secret-access-token", token_type: "Bearer" },
    }));

    expect(await reader.get("browser-session")).toEqual({});
    expect(rows.size).toBe(0);
  });

  it("rejects encryption keys that are not 32 bytes", () => {
    const { prisma } = createPrisma();

    expect(
      () =>
        new ProductNowOAuthSessionStore(
          createConfiguration(Buffer.alloc(12).toString("base64")),
          prisma,
        ),
    ).toThrow();
  });
});
