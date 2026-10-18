import { Module } from "@nestjs/common";
import { MastraModule } from "src/mastra/mastra.module";
import { DungeonController } from "./dungeon.controller";
import { DungeonService } from "./dungeon.service";

/** Exposes the dungeon meta-coordinator over HTTP. */
@Module({
  controllers: [DungeonController],
  imports: [MastraModule],
  providers: [DungeonService],
})
export class DungeonModule {}
