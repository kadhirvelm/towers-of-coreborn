import { Module } from "@nestjs/common";
import { RedisModule } from "../infra/redis/redis.module";
import { GameRoomGateway } from "./game-room.gateway";

/**
 * WebSocket room handling for the game client (join, leave, room state).
 */
@Module({
  imports: [RedisModule],
  providers: [GameRoomGateway],
})
export class GameRoomModule {}
