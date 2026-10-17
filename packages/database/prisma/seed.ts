import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../dist";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_HOST_URL,
});

const PRISMA_CLIENT = new PrismaClient({
  adapter: adapter,
});

async function seed() {
  // TODO
}

seed().then(() => PRISMA_CLIENT.$disconnect());
