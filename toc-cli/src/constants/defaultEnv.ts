import { execSync } from "node:child_process";

const defaultPostgresPassword = execSync(
  `LC_ALL=C tr -dc 'A-Za-z0-9!$%^&*_+' </dev/urandom | head -c 20`,
).toString();

// These are the default values for the local environment
export const DEFAULT_LOCAL_ENV_VALUES: Record<string, string> = {
  ANTHROPIC_API_KEY: "replace-with-local-credentials",
  BACKEND_API_URL: "https://localhost:8080",
  DATABASE_HOST_URL: `postgresql://postgres:${defaultPostgresPassword}@localhost:5432/towers-of-coreborn?schema=public`,
  FRONTEND_URL: "https://localhost:3000",
  GEMINI_CREDENTIALS: "replace-with-local-credentials",
  // Keep identical to LOCAL_MCP_OAUTH_ENCRYPTION_KEY in the backend configuration service.
  MCP_OAUTH_ENCRYPTION_KEY: "yw13/hsuCffB/07HoMSLPJ4y1CdwEWFxSvqAn1/PlYA=",
  NODE_ENV: "development",
  OPENAI_API_KEY: "replace-with-local-credentials",
  OPENOBSERVE_ROOT_USER_EMAIL: "root@example.com",
  OPENOBSERVE_ROOT_USER_PASSWORD: "LocalOpenObserve1!",
  POSTGRES_PASSWORD: defaultPostgresPassword,
  PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes",
  PUBLIC_URL: "",
  REDIS_HOST: "localhost",
  REDIS_PORT: "6379",
};
