import { describe, expect, test } from "bun:test";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { lastValueFrom, Observable } from "rxjs";
import {
  ProductNowSessionInterceptor,
  readActiveProductNowSession,
} from "../productNowSessionContext";

describe("ProductNowSessionInterceptor", () => {
  test("keeps the session cookie available while the request runs", async () => {
    const interceptor = new ProductNowSessionInterceptor();
    let seen = "";
    const context = {
      getType: () => "http",
      switchToHttp: () => ({
        getRequest: () =>
          ({
            headers: { cookie: "toc_productnow_session=session-1" },
          }) as Request,
      }),
    } as ExecutionContext;
    const next: CallHandler = {
      handle: () =>
        new Observable((subscriber) => {
          void Promise.resolve().then(() => {
            seen = readActiveProductNowSession() ?? "";
            subscriber.next(seen);
            subscriber.complete();
          });
        }),
    };

    const result = await lastValueFrom(interceptor.intercept(context, next));

    expect(result).toBe("session-1");
    expect(seen).toBe("session-1");
    expect(readActiveProductNowSession()).toBeUndefined();
  });

  test("leaves the session unset when the browser has not connected", async () => {
    const interceptor = new ProductNowSessionInterceptor();
    let seen: string | undefined = "set";
    const context = {
      getType: () => "http",
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }) as Request,
      }),
    } as ExecutionContext;
    const next: CallHandler = {
      handle: () =>
        new Observable((subscriber) => {
          seen = readActiveProductNowSession();
          subscriber.next(undefined);
          subscriber.complete();
        }),
    };

    await lastValueFrom(interceptor.intercept(context, next));

    expect(seen).toBeUndefined();
  });
});
