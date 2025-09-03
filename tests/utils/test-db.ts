import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

const TEST_DB_URL = "file:./test.db";

export async function resetTestDatabase({ seed = true } = {}) {
  try {
    if (fs.existsSync("test.db")) fs.unlinkSync("test.db");
  } catch {
    // ignore if doesn't exist
  }

  execSync("npx prisma generate", { stdio: "inherit" });

  execSync("npx prisma db push", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  });

  if (seed) {
    execSync("npx prisma db seed", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    });
  }
}

export function prismaTestClient() {
  return new PrismaClient({
    datasources: { db: { url: "file:./test.db" } },
  });
}
