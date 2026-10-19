import { describe, expect, mock, test } from "bun:test";
import {
  isProductNowRateLimitError,
  ProductNowMcpService,
} from "../product-now-mcp.service";

describe("ProductNowMcpService", () => {
  test("shares and caches concurrent ProductNow tool listings", async () => {
    const connect = mock(async () => undefined);
    const listTools = mock(async () => ({
      tools: [
        {
          description: "Search documents",
          inputSchema: { type: "object" as const },
          name: "search",
        },
      ],
    }));
    const close = mock(async () => undefined);
    const service = new ProductNowMcpService(
      { get: () => "https://productnow.test/mcp" } as never,
      { get: async () => ({ tokens: { access_token: "token" } }) } as never,
    );
    (
      service as unknown as {
        createConnection: () => unknown;
      }
    ).createConnection = () => ({
      client: { close, connect, listTools },
      provider: {},
      transport: {},
    });

    const [first, second] = await Promise.all([
      service.listTools("session-1"),
      service.listTools("session-1"),
    ]);
    const third = await service.listTools("session-1");

    expect(first).toEqual(second);
    expect(second).toEqual(third);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(listTools).toHaveBeenCalledTimes(1);
  });

  test("recognizes ProductNow HTTP throttling errors", () => {
    expect(
      isProductNowRateLimitError(
        new Error(
          'Streamable HTTP error: {"code":429,"message":"ThrottlerException: Too Many Requests"}',
        ),
      ),
    ).toBe(true);
    expect(isProductNowRateLimitError(new Error("rate limit exceeded"))).toBe(
      true,
    );
  });

  test("does not retry unrelated MCP failures", () => {
    expect(
      isProductNowRateLimitError(new Error("ProductNow connection refused")),
    ).toBe(false);
  });
});
