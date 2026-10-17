import { describe, expect, test } from "bun:test";
import { MockRedisService } from "src/infra/redis/__tests__/mockRedis.module";
import type { RedisService } from "src/infra/redis/redis.service";
import { GenerationAbortCoordinator } from "../generationAbort.coordinator";

const GENERATION_ID = "4f1c0b2e-6a7d-4c8e-9f10-123456789abc";

describe("GenerationAbortCoordinator", () => {
  test("a stop on one process aborts the run on another", async () => {
    const redis = new MockRedisService();
    const worker = coordinator(redis);
    const api = coordinator(redis);
    await worker.onModuleInit();
    await api.onModuleInit();

    const run = await worker.begin(GENERATION_ID);
    await api.stop(GENERATION_ID);

    expect(run.signal.aborted).toBe(true);
    await run.end();
  });

  test("a stop that arrives first aborts the run when it starts", async () => {
    const redis = new MockRedisService();
    const api = coordinator(redis);
    const worker = coordinator(redis);
    await api.onModuleInit();

    await api.stop(GENERATION_ID);
    const run = await worker.begin(GENERATION_ID);

    expect(run.signal.aborted).toBe(true);
    await run.end();
  });

  test("ending an older run leaves the newer controller in place", async () => {
    const redis = new MockRedisService();
    const runs = coordinator(redis);
    const first = await runs.begin(GENERATION_ID);
    const second = await runs.begin(GENERATION_ID);
    await first.end();

    expect(second.signal.aborted).toBe(false);
    await runs.stop(GENERATION_ID);
    expect(second.signal.aborted).toBe(true);
    await second.end();
  });
});

/**
 * @param redis - In-memory Redis stand-in
 * @returns A coordinator that publishes and subscribes through that Redis
 */
function coordinator(redis: MockRedisService): GenerationAbortCoordinator {
  return new GenerationAbortCoordinator(redis as unknown as RedisService);
}
