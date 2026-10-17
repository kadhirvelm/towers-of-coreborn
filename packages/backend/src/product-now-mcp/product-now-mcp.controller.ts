import { randomUUID } from "node:crypto";
import { Body, Controller, Get, Header, Query, Req, Res } from "@nestjs/common";
import {
  type ProductNowMcpServiceApi,
  ProductNowMcpServiceDefinition,
  type ProductNowMcpStatus,
} from "@towers-of-coreborn/api";
import type { Request, Response } from "express";
import { ConfigurationService } from "../configuration/configuration.service";
import {
  getDecorator,
  type ServiceControllerInterface,
} from "../genericTypes/controller";
import { ProductNowMcpService } from "./product-now-mcp.service";
import {
  PRODUCT_NOW_SESSION_COOKIE_NAME,
  readProductNowSessionId,
  requireProductNowSessionId,
} from "./productNowSessionCookie";

const SESSION_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

/**
 * ProductNow OAuth browser flow and authenticated MCP operations.
 */
@Controller(ProductNowMcpServiceDefinition.controller)
export class ProductNowMcpController
  implements ServiceControllerInterface<ProductNowMcpServiceApi>
{
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly productNowMcpService: ProductNowMcpService,
  ) {}

  /**
   * Calls a ProductNow MCP tool for the current browser.
   * @param payload - Tool name and arguments
   * @param request - Incoming request carrying the session cookie
   * @returns Raw MCP tool result
   */
  @getDecorator(ProductNowMcpServiceDefinition.endpoints.callTool)
  public async callTool(
    @Body() payload: ProductNowMcpServiceApi["callTool"]["payload"],
    @Req() request: Request,
  ): Promise<unknown> {
    return this.productNowMcpService.callTool(
      this.requireSessionId(request),
      payload.name,
      payload.arguments,
    );
  }

  /**
   * Starts ProductNow OAuth and redirects the browser to ProductNow.
   * @param request - Incoming browser request
   * @param response - Express response used for cookie and redirect
   */
  @Get("oauth/connect")
  public async connect(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const sessionId = readProductNowSessionId(request) ?? randomUUID();
    response.cookie(PRODUCT_NOW_SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
      path: "/",
      sameSite: "lax",
      secure: this.configurationService
        .get("BACKEND_API_URL")
        .startsWith("https://"),
    });

    const authorizationUrl =
      await this.productNowMcpService.beginAuthorization(sessionId);
    response.redirect(authorizationUrl.toString());
  }

  /**
   * Removes ProductNow credentials for the current browser.
   * @param _payload - Unused empty payload
   * @param request - Incoming request carrying the session cookie
   * @returns Disconnected status
   */
  @getDecorator(ProductNowMcpServiceDefinition.endpoints.disconnect)
  public async disconnect(
    @Body() _payload: null,
    @Req() request: Request,
  ): Promise<ProductNowMcpStatus> {
    const sessionId = readProductNowSessionId(request);
    if (sessionId) {
      await this.productNowMcpService.disconnect(sessionId);
    }
    return { connected: false };
  }

  /**
   * Reports whether the current browser has connected ProductNow.
   * @param _payload - Unused empty payload
   * @param request - Incoming request carrying the session cookie
   * @returns Connection status
   */
  @getDecorator(ProductNowMcpServiceDefinition.endpoints.getStatus)
  public async getStatus(
    @Body() _payload: null,
    @Req() request: Request,
  ): Promise<ProductNowMcpStatus> {
    const sessionId = readProductNowSessionId(request);
    if (!sessionId) {
      return { connected: false };
    }
    return {
      connected: await this.productNowMcpService.isConnected(sessionId),
    };
  }

  /**
   * Lists ProductNow MCP tools for the current browser.
   * @param _payload - Unused empty payload
   * @param request - Incoming request carrying the session cookie
   * @returns ProductNow tool declarations
   */
  @getDecorator(ProductNowMcpServiceDefinition.endpoints.listTools)
  public async listTools(
    @Body() _payload: null,
    @Req() request: Request,
  ): Promise<ProductNowMcpServiceApi["listTools"]["response"]> {
    return this.productNowMcpService.listTools(this.requireSessionId(request));
  }

  /**
   * Completes ProductNow OAuth and returns the browser to the game.
   * @param request - Incoming callback request carrying the session cookie
   * @param response - Express response used for the final redirect
   * @param code - OAuth authorization code
   * @param state - OAuth state
   * @param error - OAuth error code from ProductNow
   */
  @Get("oauth/callback")
  public async oauthCallback(
    @Req() request: Request,
    @Res() response: Response,
    @Query("code") code?: string,
    @Query("state") state?: string,
    @Query("error") error?: string,
  ): Promise<void> {
    const frontendUrl = this.configurationService
      .get("FRONTEND_URL")
      .replace(/\/$/, "");

    if (error) {
      response.redirect(
        `${frontendUrl}/?productNow=error&reason=${encodeURIComponent(error)}`,
      );
      return;
    }

    if (!code || !state) {
      response.redirect(`${frontendUrl}/?productNow=error&reason=missing_code`);
      return;
    }

    await this.productNowMcpService.finishAuthorization(
      this.requireSessionId(request),
      code,
      state,
    );
    response.redirect(`${frontendUrl}/?productNow=connected`);
  }

  /**
   * Reads the session cookie or rejects the request.
   * @param request - Incoming request
   * @returns Browser session identifier
   */
  private requireSessionId(request: Request): string {
    return requireProductNowSessionId(request);
  }
}

/**
 * Serves the OAuth Client ID Metadata Document that identifies Towers of Coreborn.
 */
@Controller(".well-known/oauth-client-metadata")
export class ProductNowClientMetadataController {
  public constructor(
    private readonly productNowMcpService: ProductNowMcpService,
  ) {}

  /**
   * Returns the CIMD whose URL is used as the OAuth client_id.
   * @returns OAuth client metadata including client_id
   */
  @Get("towers-of-coreborn.json")
  @Header("Cache-Control", "public, max-age=300")
  public getClientMetadata(): Record<string, unknown> {
    const provider = this.productNowMcpService.createProvider("metadata");
    return {
      ...provider.clientMetadata,
      client_id: provider.clientMetadataUrl,
    };
  }
}
