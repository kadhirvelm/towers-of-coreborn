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

## Checks

```bash
bun run check
bun run lint
bun run test
```
