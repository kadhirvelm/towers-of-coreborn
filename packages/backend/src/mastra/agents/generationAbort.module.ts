import { Module } from "@nestjs/common";
import { RedisModule } from "src/infra/redis/redis.module";
import { GenerationAbortCoordinator } from "./generationAbort.coordinator";

/**
 * Redis-backed abort coordination for asset-generation agents.
 */
@Module({
  exports: [GenerationAbortCoordinator],
  imports: [RedisModule],
  providers: [GenerationAbortCoordinator],
})
export class GenerationAbortModule {}
