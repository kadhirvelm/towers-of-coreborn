import { INestApplicationContext } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { ServerOptions } from "socket.io";
import { RedisService } from "./redis.service";

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(
    app: INestApplicationContext,
    private readonly redisService: RedisService,
  ) {
    super(app);
  }

  async connectToRedis() {
    const pubClient = this.redisService.getPublisher();
    const subClient = this.redisService.getSubscriber();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (!this.adapterConstructor) {
      throw new Error(
        "Redis adapter not initialized - call connectToRedis() first",
      );
    }
    server.adapter(this.adapterConstructor);
    return server;
  }
}
