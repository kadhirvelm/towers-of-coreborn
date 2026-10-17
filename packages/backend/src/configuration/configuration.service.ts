import { Injectable } from "@nestjs/common";

/**
 * Runtime configuration read from the environment.
 * Only keys the application actually uses belong here.
 */
export interface Configuration {
  BACKEND_API_URL: string;
  FRONTEND_URL: string;
  DATABASE_HOST_URL: string;
  NODE_ENV: "production" | "development";
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
    const openAiApiKey = process.env.OPENAI_API_KEY;

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
      NODE_ENV: process.env.NODE_ENV as "production" | "development",
      OPENAI_API_KEY: openAiApiKey,
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
