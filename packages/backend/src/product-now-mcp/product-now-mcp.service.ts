import { randomUUID } from "node:crypto";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { ProductNowMcpTool } from "@towers-of-coreborn/api";
import { ConfigurationService } from "../configuration/configuration.service";
import { ProductNowOAuthClientProvider } from "./productNowOAuthClient.provider";
import { ProductNowOAuthSessionStore } from "./productNowOAuthSession.store";

interface ProductNowConnection {
  client: Client;
  provider: ProductNowOAuthClientProvider;
  transport: StreamableHTTPClientTransport;
}

/**
 * Owns ProductNow's MCP OAuth lifecycle and authenticated tool calls.
 */
@Injectable()
export class ProductNowMcpService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly sessionStore: ProductNowOAuthSessionStore,
  ) {}

  /**
   * Starts OAuth discovery and returns ProductNow's browser authorization URL.
   * @param sessionId - Opaque browser session identifier
   * @returns URL where the browser should be redirected
   */
  public async beginAuthorization(sessionId: string): Promise<URL> {
    await this.sessionStore.update(sessionId, (session) => ({
      discoveryState: session.discoveryState,
      oauthState: randomUUID(),
    }));

    const connection = this.createConnection(sessionId);
    try {
      await connection.client.connect(connection.transport);
    } catch (error) {
      await this.closeConnection(connection);
      if (!(error instanceof UnauthorizedError)) {
        throw new BadGatewayException(
          `Unable to start ProductNow OAuth: ${this.getErrorMessage(error)}`,
        );
      }
      if (!connection.provider.authorizationUrl) {
        throw new BadGatewayException(
          "ProductNow did not provide an OAuth authorization URL",
        );
      }
      return connection.provider.authorizationUrl;
    }

    await this.closeConnection(connection);
    throw new BadGatewayException(
      "ProductNow accepted an unauthenticated MCP connection",
    );
  }

  /**
   * Calls one ProductNow MCP tool for the connected browser.
   * @param sessionId - Opaque browser session identifier
   * @param name - MCP tool name
   * @param toolArguments - JSON arguments accepted by the tool
   * @returns Raw MCP tool result
   */
  public async callTool(
    sessionId: string,
    name: string,
    toolArguments?: Record<string, unknown>,
    abortSignal?: AbortSignal,
  ): Promise<unknown> {
    return this.withConnectedClient(sessionId, async (client) =>
      client.callTool({ arguments: toolArguments, name }, undefined, {
        signal: abortSignal,
      }),
    );
  }

  /**
   * Removes all ProductNow credentials for one browser.
   * @param sessionId - Opaque browser session identifier
   */
  public async disconnect(sessionId: string): Promise<void> {
    await this.sessionStore.delete(sessionId);
  }

  /**
   * Exchanges ProductNow's authorization code and verifies the MCP connection.
   * @param sessionId - Opaque browser session identifier
   * @param authorizationCode - OAuth authorization code
   * @param oauthState - State returned by ProductNow
   */
  public async finishAuthorization(
    sessionId: string,
    authorizationCode: string,
    oauthState: string,
  ): Promise<void> {
    const session = await this.sessionStore.get(sessionId);
    if (!session.oauthState || session.oauthState !== oauthState) {
      throw new UnauthorizedException("Invalid ProductNow OAuth state");
    }

    const connection = this.createConnection(sessionId);
    try {
      await connection.transport.finishAuth(authorizationCode);
      await connection.client.connect(connection.transport);
      await connection.client.listTools();
      await this.sessionStore.update(sessionId, (updatedSession) => ({
        ...updatedSession,
        oauthState: undefined,
      }));
    } catch (error) {
      throw new BadGatewayException(
        `Unable to finish ProductNow OAuth: ${this.getErrorMessage(error)}`,
      );
    } finally {
      await this.closeConnection(connection);
    }
  }

  /**
   * Builds the OAuth provider used for metadata, discovery, and token storage.
   * @param sessionId - Opaque browser session identifier
   * @returns Provider bound to the browser session
   */
  public createProvider(sessionId: string): ProductNowOAuthClientProvider {
    return new ProductNowOAuthClientProvider(sessionId, this.sessionStore, {
      backendApiUrl: this.configurationService.get("BACKEND_API_URL"),
      frontendUrl: this.configurationService.get("FRONTEND_URL"),
    });
  }

  /**
   * Reports whether the browser has ProductNow OAuth tokens.
   * @param sessionId - Opaque browser session identifier
   * @returns True when tokens are stored
   */
  public async isConnected(sessionId: string): Promise<boolean> {
    return Boolean((await this.sessionStore.get(sessionId)).tokens);
  }

  /**
   * Lists tools available to the connected ProductNow user.
   * @param sessionId - Opaque browser session identifier
   * @returns ProductNow MCP tool declarations
   */
  public async listTools(
    sessionId: string,
  ): Promise<{ tools: ProductNowMcpTool[] }> {
    return this.withConnectedClient(sessionId, async (client) => {
      const { tools } = await client.listTools();
      return {
        tools: tools.map((tool) => ({
          description: tool.description,
          inputSchema: tool.inputSchema,
          name: tool.name,
        })),
      };
    });
  }

  /**
   * Closes a client without masking the original operation result.
   * @param connection - Active or partially active MCP connection
   */
  private async closeConnection(
    connection: ProductNowConnection,
  ): Promise<void> {
    await connection.client.close().catch(() => undefined);
  }

  /**
   * Constructs an MCP client and OAuth-aware HTTP transport.
   * @param sessionId - Opaque browser session identifier
   * @returns Client connection parts
   */
  private createConnection(sessionId: string): ProductNowConnection {
    const provider = this.createProvider(sessionId);
    const transport = new StreamableHTTPClientTransport(
      new URL(this.configurationService.get("PRODUCTNOW_MCP_URL")),
      { authProvider: provider },
    );
    const client = new Client(
      { name: "towers-of-coreborn", version: "1.0.0" },
      { capabilities: {} },
    );
    return { client, provider, transport };
  }

  /**
   * Converts unknown thrown values to safe diagnostic text.
   * @param error - Thrown value
   * @returns Error message
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Connects with stored credentials, runs an MCP operation, and closes the client.
   * @param sessionId - Opaque browser session identifier
   * @param operation - MCP operation to run
   * @returns Operation result
   */
  private async withConnectedClient<T>(
    sessionId: string,
    operation: (client: Client) => Promise<T>,
  ): Promise<T> {
    if (!(await this.isConnected(sessionId))) {
      throw new UnauthorizedException(
        "Connect ProductNow before using its tools",
      );
    }

    const connection = this.createConnection(sessionId);
    try {
      await connection.client.connect(connection.transport);
      return await operation(connection.client);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw new UnauthorizedException(
          "The ProductNow session expired; reconnect ProductNow",
        );
      }
      throw new BadGatewayException(
        `ProductNow MCP request failed: ${this.getErrorMessage(error)}`,
      );
    } finally {
      await this.closeConnection(connection);
    }
  }
}
