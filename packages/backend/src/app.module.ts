import { Module } from "@nestjs/common";
import { AssetClassesModule } from "./asset-classes/asset-classes.module";
import { ConfigurationModule } from "./configuration/configuration.module";
import { GameRoomModule } from "./game-room/game-room.module";
import { RedisModule } from "./infra/redis/redis.module";
import { AllExceptionsFilter } from "./library/AllExceptions.filter";
import { TowersOfCorebornLoggerModule } from "./logger/logger.module";

export const SharedModules = [
  ConfigurationModule,
  TowersOfCorebornLoggerModule,
  RedisModule,
];

@Module({
  imports: [GameRoomModule, AssetClassesModule, ...SharedModules],
  providers: [AllExceptionsFilter],
})
export class AppModule {}
