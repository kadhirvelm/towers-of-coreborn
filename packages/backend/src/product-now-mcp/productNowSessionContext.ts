import { AsyncLocalStorage } from "node:async_hooks";
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { Observable } from "rxjs";
import { readProductNowSessionId } from "./productNowSessionCookie";

/**
 * Mastra request-context key for the browser's ProductNow session.
 * Tools read this when a caller sets it on the agent run.
 */
export const PRODUCT_NOW_SESSION_REQUEST_KEY = "productNowSessionId";

const productNowSessionStorage = new AsyncLocalStorage<string>();

/**
 * Reads the ProductNow session bound to the current request, if one was set.
 * @returns Browser session id, or `undefined` outside a ProductNow request
 */
export function readActiveProductNowSession(): string | undefined {
  return productNowSessionStorage.getStore();
}

/**
 * Runs `fn` with a ProductNow session available to agent tools.
 * @param sessionId - Browser session that holds the ProductNow OAuth tokens
 * @param fn - Work that may call ProductNow tools
 * @returns Whatever `fn` returns
 */
export function runWithProductNowSession<T>(sessionId: string, fn: () => T): T {
  return productNowSessionStorage.run(sessionId, fn);
}

/**
 * Binds the ProductNow session cookie for the rest of an HTTP request.
 * Agent tools read it with {@link readActiveProductNowSession} instead of
 * asking the model for a token.
 */
@Injectable()
export class ProductNowSessionInterceptor implements NestInterceptor {
  /**
   * Stores the session cookie while the route handler runs.
   * @param context - Nest execution context
   * @param next - Remainder of the request pipeline
   * @returns The handler's response stream
   */
  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = readProductNowSessionId(request);
    if (sessionId === undefined) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      const subscription = productNowSessionStorage.run(sessionId, () =>
        next.handle().subscribe(subscriber),
      );
      return () => subscription.unsubscribe();
    });
  }
}
