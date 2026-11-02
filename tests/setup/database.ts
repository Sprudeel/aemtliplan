import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { loadTestEnv } from "./env";

/**
 * Brings the *_test database to the current migrations (non-destructive),
 * then empties all tables once before the run. Every test creates its own users and plans.
 */
export default async function setup() {
  loadTestEnv();
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });

  const prisma = new PrismaClient();
  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    if (tables.length) {
      const list = tables.map((t) => `"${t.tablename}"`).join(", ");
      await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
