# Backend

NestJS API for Towers of Coreborn.

Run the full development environment from the repository root:

```bash
bun run dev
```

The backend listens on `https://localhost:8080`.

## Logging

The backend writes structured logs with Pino. Development logs are
pretty-printed; production emits JSON to stdout. Compose container logs are
available in the local OpenObserve instance documented in the root README.

## ProductNow MCP OAuth

Towers of Coreborn connects to ProductNow's MCP server as a public OAuth client
identified by a Client ID Metadata Document (CIMD):

```text
${BACKEND_API_URL}/.well-known/oauth-client-metadata/towers-of-coreborn.json
```

That URL is the OAuth `client_id`, so ProductNow's authorization server must be
able to fetch it over public HTTPS. For local testing, expose the backend
through an HTTPS tunnel and set `BACKEND_API_URL` to the tunnel URL. The CIMD's
`logo_uri` points at `${FRONTEND_URL}/logo.png`.

Environment:

- `MCP_OAUTH_ENCRYPTION_KEY`: required in production; 32 random bytes encoded
  as base64 (`openssl rand -base64 32`).
- `PRODUCTNOW_MCP_URL`: defaults to `https://api.productnow-prod.com/mcp`.

OAuth tokens, PKCE verifiers, and state are stored per browser in Redis,
encrypted with AES-256-GCM. The browser only holds an opaque HttpOnly session
cookie.

## Checks

```bash
bun run check
bun run lint
bun run test
```
