import { Global, Injectable, Module } from "@nestjs/common";
import { RedisService } from "../redis.service";

/**
 * Mock Redis client that provides stub implementations of common Redis methods.
 * Used by MockRedisService to satisfy code that calls getClient(), getSubscriber(), or getPublisher().
 */
class MockRedisClient {
  async ttl(_key: string): Promise<number> {
    return -1;
  }

  async get(_key: string): Promise<string | null> {
    return null;
  }

  async set(
    _key: string,
    _value: string,
    ..._args: unknown[]
  ): Promise<string | null> {
    return "OK";
  }

  async del(..._keys: string[]): Promise<number> {
    return 0;
  }

  async publish(_channel: string, _message: string): Promise<number> {
    return 0;
  }

  async subscribe(_channel: string): Promise<void> {
    return;
  }

  on(_event: string, _callback: (...args: unknown[]) => void): this {
    return this;
  }

  async quit(): Promise<string> {
    return "OK";
  }
}

/**
 * In-memory mock implementation of RedisService for testing.
 * Provides all the same methods as RedisService but stores data in memory
 * instead of connecting to an actual Redis server.
 */
@Injectable()
export class MockRedisService {
  private store: Map<string, string> = new Map();
  private hashStore: Map<string, Map<string, string>> = new Map();
  private setStore: Map<string, Set<string>> = new Map();
  private subscriptions: Map<string, ((message: string) => void)[]> = new Map();
  private mockClient = new MockRedisClient();

  /**
   * Clears all stored data. Useful for resetting state between tests.
   */
  clear(): void {
    this.store.clear();
    this.hashStore.clear();
    this.setStore.clear();
    this.subscriptions.clear();
  }

  // === Data Operations ===

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(
    key: string,
    value: string,
    _ttlSeconds?: number,
  ): Promise<string | null> {
    this.store.set(key, value);
    return "OK";
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  async expire(_key: string, _ttlSeconds: number): Promise<number> {
    return 1;
  }

  // === Hash Operations ===

  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.hashStore.get(key);
    return hash?.get(field) ?? null;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    let hash = this.hashStore.get(key);
    if (!hash) {
      hash = new Map();
      this.hashStore.set(key, hash);
    }
    const isNew = !hash.has(field);
    hash.set(field, value);
    return isNew ? 1 : 0;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashStore.get(key);
    if (!hash) {
      return {};
    }
    return Object.fromEntries(hash.entries());
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.hashStore.get(key);
    if (!hash) {
      return 0;
    }
    let deleted = 0;
    for (const field of fields) {
      if (hash.delete(field)) {
        deleted++;
      }
    }
    return deleted;
  }

  async hlen(key: string): Promise<number> {
    const hash = this.hashStore.get(key);
    return hash?.size ?? 0;
  }

  async hkeys(key: string): Promise<string[]> {
    const hash = this.hashStore.get(key);
    return hash ? Array.from(hash.keys()) : [];
  }

  async hvals(key: string): Promise<string[]> {
    const hash = this.hashStore.get(key);
    return hash ? Array.from(hash.values()) : [];
  }

  // === Set Operations ===

  async sadd(key: string, ...members: string[]): Promise<number> {
    let set = this.setStore.get(key);
    if (!set) {
      set = new Set();
      this.setStore.set(key, set);
    }
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.setStore.get(key);
    if (!set) {
      return 0;
    }
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed++;
      }
    }
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.setStore.get(key);
    return set ? Array.from(set) : [];
  }

  async sismember(key: string, member: string): Promise<number> {
    const set = this.setStore.get(key);
    return set?.has(member) ? 1 : 0;
  }

  // === Pub/Sub Operations ===

  async publish(channel: string, message: string): Promise<number> {
    const callbacks = this.subscriptions.get(channel) ?? [];
    for (const callback of callbacks) {
      callback(message);
    }
    return callbacks.length;
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    let callbacks = this.subscriptions.get(channel);
    if (!callbacks) {
      callbacks = [];
      this.subscriptions.set(channel, callbacks);
    }
    callbacks.push(callback);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.subscriptions.delete(channel);
  }

  // === Locking ===

  async withLock<T>(
    _keys: string[],
    _durationMs: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    return fn();
  }

  // === Client Accessors ===

  /**
   * Returns a mock Redis client for data operations
   */
  getClient(): MockRedisClient {
    return this.mockClient;
  }

  /**
   * Returns a mock Redis client for subscriptions
   */
  getSubscriber(): MockRedisClient {
    return this.mockClient;
  }

  /**
   * Returns a mock Redis client for publishing
   */
  getPublisher(): MockRedisClient {
    return this.mockClient;
  }

  // === Lifecycle (no-op for mock) ===

  async onModuleDestroy(): Promise<void> {
    this.clear();
  }
}

/**
 * Mock Redis module for testing. Provides an in-memory implementation
 * of RedisService that doesn't require a real Redis connection.
 */
@Global()
@Module({
  exports: [RedisService],
  providers: [
    {
      provide: RedisService,
      useClass: MockRedisService,
    },
  ],
})
export class MockRedisModule {}
