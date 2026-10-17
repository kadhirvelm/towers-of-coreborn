/**
 * Builds the Pino transport configuration.
 * In development, logs are pretty-printed. Production emits raw JSON to stdout
 * so the deployment's log collector can process it.
 * @returns A development transport or undefined in production.
 */
export function buildPinoTransport() {
  if (process.env.NODE_ENV === "production") return undefined;
  return { target: "pino-pretty" };
}
