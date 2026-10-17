import { Injectable, Logger, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

@Injectable()
export class AppLoggerMiddleware implements NestMiddleware {
  private logger = new Logger("HTTP");

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl: url } = request;

    response.on("close", () => {
      const { statusCode } = response;

      this.logger.log(
        `(${statusCode}) ${method} to ${url} with payload ${JSON.stringify(request.body)}`,
      );
    });

    next();
  }
}
