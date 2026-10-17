import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: {
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_HOST_URL,
    url: env("DATABASE_HOST_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  schema: "prisma/schema.prisma",
});
