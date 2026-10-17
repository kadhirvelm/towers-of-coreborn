import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { RedisModule } from "../infra/redis/redis.module";
import {
  ProductNowClientMetadataController,
  ProductNowMcpController,
} from "./product-now-mcp.controller";
import { ProductNowMcpService } from "./product-now-mcp.service";
import { ProductNowOAuthSessionStore } from "./productNowOAuthSession.store";
import { ProductNowSessionInterceptor } from "./productNowSessionContext";

/** ProductNow MCP OAuth client and authenticated tool access. */
@Module({
  controllers: [ProductNowClientMetadataController, ProductNowMcpController],
  exports: [ProductNowMcpService],
  imports: [RedisModule],
  providers: [
    ProductNowMcpService,
    ProductNowOAuthSessionStore,
    {
      provide: APP_INTERCEPTOR,
      useClass: ProductNowSessionInterceptor,
    },
  ],
})
export class ProductNowMcpModule {}
