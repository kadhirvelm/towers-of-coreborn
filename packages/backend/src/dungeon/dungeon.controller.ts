import { Body, Controller, UseInterceptors } from "@nestjs/common";
import {
  type DungeonServiceApi,
  DungeonServiceDefinition,
} from "@towers-of-coreborn/api";
import {
  getDecorator,
  type ServiceControllerInterface,
} from "src/genericTypes/controller";
import { Timeout } from "src/library/timeout/timeout.decorator";
import { TimeoutInterceptor } from "src/library/timeout/timeout.interceptor";
import { requireActiveProductNowSession } from "src/product-now-mcp/productNowSessionContext";
import { DungeonService } from "./dungeon.service";

/** Maximum HTTP lifetime for a multi-asset dungeon generation. */
const DUNGEON_GENERATION_TIMEOUT_MS = 60 * 60 * 1000;

/** REST entry point for the dungeon meta-coordinator. */
@UseInterceptors(TimeoutInterceptor)
@Controller(DungeonServiceDefinition.controller)
export class DungeonController
  implements ServiceControllerInterface<DungeonServiceApi>
{
  public constructor(private readonly dungeonService: DungeonService) {}

  /**
   * Stops the parent coordinator and its active child generation.
   * @param payload - Parent generation id
   * @returns Whether cancellation was recorded
   */
  @getDecorator(DungeonServiceDefinition.endpoints.cancel)
  public cancel(@Body() payload: DungeonServiceApi["cancel"]["payload"]) {
    return this.dungeonService.cancel(payload);
  }

  /**
   * Generates a dungeon asset set using the connected ProductNow session.
   * @param payload - Broad dungeon prompt
   * @returns Backgrounds and characters with their cards
   */
  @Timeout(DUNGEON_GENERATION_TIMEOUT_MS)
  @getDecorator(DungeonServiceDefinition.endpoints.generate)
  public generate(@Body() payload: DungeonServiceApi["generate"]["payload"]) {
    return this.dungeonService.generate(
      payload,
      requireActiveProductNowSession(),
    );
  }
}
