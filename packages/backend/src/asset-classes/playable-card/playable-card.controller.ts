import { Body, Controller, Req, UseInterceptors } from "@nestjs/common";
import {
  type PlayableCardServiceApi,
  PlayableCardServiceDefinition,
} from "@towers-of-coreborn/api";
import type { Request } from "express";
import {
  getDecorator,
  type ServiceControllerInterface,
} from "src/genericTypes/controller";
import { Timeout } from "src/library/timeout/timeout.decorator";
import { TimeoutInterceptor } from "src/library/timeout/timeout.interceptor";
import { requireProductNowSessionId } from "src/product-now-mcp/productNowSessionCookie";
import { ASSET_CLASS_GENERATION_TIMEOUT_MS } from "../shared/createAssetClassController";
import { PlayableCardService } from "./playable-card.service";

/**
 * `POST /playable-cards/generate`, `POST /playable-cards/cancel`, and
 * `POST /playable-cards/list`. Generation uses the browser's ProductNow
 * session to search the Lore document.
 */
@UseInterceptors(TimeoutInterceptor)
@Controller(PlayableCardServiceDefinition.controller)
export class PlayableCardController
  implements ServiceControllerInterface<PlayableCardServiceApi>
{
  public constructor(
    private readonly playableCardService: PlayableCardService,
  ) {}

  /**
   * Stops an in-flight playable-card generation.
   * @param payload - Client generation id
   * @returns Whether the stop was recorded
   */
  @getDecorator(PlayableCardServiceDefinition.endpoints.cancel)
  public cancel(@Body() payload: PlayableCardServiceApi["cancel"]["payload"]) {
    return this.playableCardService.cancel(payload);
  }

  /**
   * Generates one playable card for the connected ProductNow browser.
   * @param payload - Natural-language card prompt
   * @param request - Incoming request carrying the ProductNow session cookie
   * @returns The stored card
   */
  @Timeout(ASSET_CLASS_GENERATION_TIMEOUT_MS)
  @getDecorator(PlayableCardServiceDefinition.endpoints.generate)
  public generate(
    @Body() payload: PlayableCardServiceApi["generate"]["payload"],
    @Req() request: Request,
  ) {
    return this.playableCardService.generate(
      payload,
      requireProductNowSessionId(request),
    );
  }

  /**
   * Lists stored playable cards.
   * @returns Newest cards first
   */
  @getDecorator(PlayableCardServiceDefinition.endpoints.list)
  public list() {
    return this.playableCardService.list();
  }
}
