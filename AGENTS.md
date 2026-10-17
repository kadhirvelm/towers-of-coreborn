# Towers of Coreborn development guide

## Repository

Towers of Coreborn is a Bun and TypeScript monorepo:

- `packages/frontend` — Next.js 16 and React 19 game client
- `packages/backend` — NestJS API, WebSockets, and asset generation
- `packages/api` — shared service and WebSocket contracts
- `packages/database` — Prisma schema and generated client
- `toc-cli` — local development commands

Use Bun for package management and scripts. Do not use npm, pnpm, yarn, or
npx.

## Common commands

```bash
bun run dev
bun run build
bun run check
bun run test
bun run lint

bun run toc database db:migrate
bun run toc database db:seed
bun run toc database db:studio
```

Tests use `bun:test`. Type-check individual packages with `bun run check` from
that package directory.

## Architecture

### Backend

- Entry point: `packages/backend/src/runtimes/main.ts`
- Root module: `packages/backend/src/app.module.ts`
- Configuration: `packages/backend/src/configuration/`
- Redis: `packages/backend/src/infra/redis/`
- WebSockets: `packages/backend/src/websockets/`
- Asset classes: `packages/backend/src/asset-classes/`
- AI providers and orchestration: `packages/backend/src/model/` and
  `packages/backend/src/mastra/`

Use Nest dependency injection. Read environment values through
`ConfigurationService` outside startup/configuration code. Use the shared
`PrismaService` and transactions for multi-step writes.

### Frontend

The frontend uses the App Router. Routes live in `packages/frontend/src/app/`.
Components call the backend through `packages/frontend/src/services/`; do not
fetch service endpoints directly from components. Prefer Server Components and
add `"use client"` only for hooks, event handlers, or browser APIs.

### Shared contracts

Anything shared between frontend and backend belongs in `packages/api/src/`
and is imported from `@towers-of-coreborn/api`.

### Database

The schema is `packages/database/prisma/schema.prisma`. Never hand-edit an
existing migration. Generate migrations through the `toc database` command.

## Asset classes

Each generated game-asset type has a shared API definition, a backend module,
and a frontend gallery definition.

To add an asset class named `foo`:

1. Add `packages/api/src/services/assetClasses/foo.ts`, export it from the
   asset-class index, and register it in `AVAILABLE_SERVICES`.
2. Add `packages/backend/src/asset-classes/foo/`, following `card-character`.
   Use `createAssetClassStorage`; do not hand-build public asset paths.
3. Register its module in `asset-classes.module.ts`.
4. Add a frontend `AssetClassDefinition` and register it in
   `assetClassRegistry.ts`.

Service callers return `ServiceError` values rather than throwing. Check
`isServiceError(result)` before using the response.

## Code standards

- Use clear, descriptive names.
- Avoid nested `if` statements. Prefer guard clauses and early returns.
- Never use nested ternaries.
- Extract reusable or non-trivial logic into small, tested utilities.
- Document every function, method, and React component added with concise
  JSDoc, including parameters and return behavior.
- Keep React components focused; separate business logic from presentation.
- Add utility tests beside the implementation using `.test.ts`.
- Do not commit generated output (`dist`, `.next`, `.turbo`, generated Prisma
  clients), credentials, or runtime-generated assets.

## GitHub Actions

- Bind free-text expressions to environment variables before using them in
  shell scripts; never interpolate them directly into `run`.
- Start multi-command shell blocks with `set -euo pipefail`.
- Quote variables and validate external inputs early.
- Require full 40-character commit SHAs for image/deployment lookup.
- Give workflows only the permissions they need.
- Use `continue-on-error: true` for notification steps.

## Keeping this file accurate

Update this guide when package structure, commands, or durable conventions
change. Keep it concise and remove stale guidance rather than preserving
historical architecture.
