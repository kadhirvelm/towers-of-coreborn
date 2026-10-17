import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  RequestTimeoutException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TimeoutError, throwError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";
import { TIMEOUT_KEY } from "./timeout.decorator";

const DEFAULT_TIMEOUT_MS = 30_000;

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const timeoutMs = this.reflector.getAllAndOverride<number>(TIMEOUT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const finalTimeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return next.handle().pipe(
      timeout(finalTimeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException(
                `Request timeout after ${finalTimeoutMs}ms`,
              ),
          );
        }

        return throwError(() => err);
      }),
    );
  }
}
