import { Injectable } from "@nestjs/common";

/**
 * Local ProductNow session key used when `MCP_OAUTH_ENCRYPTION_KEY` is unset.
 * Keep this value identical to `MCP_OAUTH_ENCRYPTION_KEY` in
 * `toc-cli/src/constants/defaultEnv.ts`.
 */
const LOCAL_MCP_OAUTH_ENCRYPTION_KEY =
  "yw13/hsuCffB/07HoMSLPJ4y1CdwEWFxSvqAn1/PlYA=";

/**
 * Runtime configuration read from the environment.
 * Only keys the application actually uses belong here.
 */
export interface Configuration {
  BACKEND_API_URL: string;
  FRONTEND_URL: string;
  DATABASE_HOST_URL: string;
  NODE_ENV: "production" | "development";
  MCP_OAUTH_ENCRYPTION_KEY: string;
  PRODUCTNOW_MCP_URL: string;
  GEMINI_CREDENTIALS: string;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
}

@Injectable()
export class ConfigurationService {
  private configuration: Configuration;

  public constructor() {
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const backendApiUrl = process.env.BACKEND_API_URL;
    const databaseHostUrl = process.env.DATABASE_HOST_URL;
    const frontendUrl = process.env.FRONTEND_URL;
    const geminiCredentials = process.env.GEMINI_CREDENTIALS;
    const configuredOauthEncryptionKey =
      process.env.MCP_OAUTH_ENCRYPTION_KEY?.trim();
    if (
      !configuredOauthEncryptionKey &&
      process.env.NODE_ENV === "production"
    ) {
      throw new Error(
        "MCP_OAUTH_ENCRYPTION_KEY must be set in production (32 random bytes encoded as base64)",
      );
    }
    const mcpOauthEncryptionKey =
      configuredOauthEncryptionKey || LOCAL_MCP_OAUTH_ENCRYPTION_KEY;
    const openAiApiKey = process.env.OPENAI_API_KEY;
    const productNowMcpUrl =
      process.env.PRODUCTNOW_MCP_URL ?? "https://api.productnow-prod.com/mcp";

    if (anthropicApiKey === undefined) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }

    if (backendApiUrl === undefined) {
      throw new Error("BACKEND_API_URL is not set");
    }

    if (databaseHostUrl === undefined) {
      throw new Error("DATABASE_HOST_URL is not set");
    }

    if (frontendUrl === undefined) {
      throw new Error("FRONTEND_URL is not set");
    }

    if (geminiCredentials === undefined) {
      throw new Error("GEMINI_CREDENTIALS is not set");
    }

    if (openAiApiKey === undefined) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    this.configuration = {
      ANTHROPIC_API_KEY: anthropicApiKey,
      BACKEND_API_URL: backendApiUrl,
      DATABASE_HOST_URL: databaseHostUrl,
      FRONTEND_URL: frontendUrl,
      GEMINI_CREDENTIALS: geminiCredentials,
      MCP_OAUTH_ENCRYPTION_KEY: mcpOauthEncryptionKey,
      NODE_ENV: process.env.NODE_ENV as "production" | "development",
      OPENAI_API_KEY: openAiApiKey,
      PRODUCTNOW_MCP_URL: productNowMcpUrl,
    };
  }

  /**
   * Returns one configuration value.
   * @param key - Configuration field to read
   * @returns The value stored for that field
   */
  public get<T extends keyof Configuration>(key: T): Configuration[T] {
    return this.configuration[key];
  }
}
