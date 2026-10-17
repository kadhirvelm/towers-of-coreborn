FROM imbios/bun-node:latest-25.8.2-slim AS builder

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN bun run --cwd packages/api build
RUN cd packages/database \
  && DATABASE_HOST_URL=postgresql://build:build@localhost:5432/build \
  bunx prisma generate
RUN bun run --cwd packages/backend build
RUN bun install --production --frozen-lockfile

FROM imbios/bun-node:latest-25.8.2-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV IS_DOCKER=true

COPY --from=builder --chown=bun:bun /app /app

USER bun
WORKDIR /app/packages/backend

EXPOSE 3000

CMD ["bun", "run", "serve"]
