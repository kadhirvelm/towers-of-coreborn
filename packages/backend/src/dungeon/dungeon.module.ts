import { Module } from "@nestjs/common";
import { RedisModule } from "src/infra/redis/redis.module";
import { MastraModule } from "src/mastra/mastra.module";
import { DungeonController } from "./dungeon.controller";
import { DungeonService } from "./dungeon.service";
import { DungeonAssetLookup } from "./dungeonAssetLookup";
import { DungeonBlueprintStore } from "./dungeonBlueprintStore";
import { DungeonInFlightStore } from "./dungeonInFlightStore";
import { DungeonSlotGenerator } from "./dungeonSlotGenerator";
import { DUNGEON_STORAGE, DUNGEON_STORAGE_TOKEN } from "./dungeonStorage";

/** Exposes dungeon packages over HTTP. */
@Module({
  controllers: [DungeonController],
  imports: [MastraModule, RedisModule],
  providers: [
    DungeonAssetLookup,
    DungeonBlueprintStore,
    DungeonInFlightStore,
    DungeonSlotGenerator,
    DungeonService,
    { provide: DUNGEON_STORAGE_TOKEN, useValue: DUNGEON_STORAGE },
  ],
})
export class DungeonModule {}
