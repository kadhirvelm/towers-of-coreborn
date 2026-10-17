import { describe, expect, test } from "bun:test";
import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import {
  readProductNowSessionId,
  requireProductNowSessionId,
} from "../productNowSessionCookie";

describe("productNow session cookie", () => {
  test("reads and decodes the session cookie", () => {
    const request = {
      headers: { cookie: "other=1; toc_productnow_session=abc%201" },
    } as Request;

    expect(readProductNowSessionId(request)).toBe("abc 1");
  });

  test("rejects a request that has not started a ProductNow session", () => {
    const request = { headers: {} } as Request;

    expect(readProductNowSessionId(request)).toBeUndefined();
    let message = "";
    try {
      requireProductNowSessionId(request);
    } catch (error) {
      message = error instanceof UnauthorizedException ? error.message : "";
    }
    expect(message).toBe("Connect ProductNow first");
  });
});
