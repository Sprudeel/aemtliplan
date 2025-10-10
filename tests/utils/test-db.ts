// tests/utils/test-db.ts
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const lockout = 20_000;
const DEFAULT_DB_URL = "file:./test.db";

function resolveSqlitePath(dbUrl: string) {
  if (!dbUrl.startsWith("file:")) return null;
  const withoutPrefix = dbUrl.slice("file:".length);
  const [rawPath] = withoutPrefix.split("?");
  if (!rawPath) return null;
  return path.resolve(process.cwd(), rawPath);
}
function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? DEFAULT_DB_URL;
}

// simple file lock + stale cleanup
async function withResetLock<T>(fn: () => Promise<T>) {
  const lockDir = path.resolve(".tmp");
  const lockFile = path.join(lockDir, "db-reset.lock");
  fs.mkdirSync(lockDir, { recursive: true });

  // remove stale lock (> 20s old)
  try {
    const st = fs.statSync(lockFile);
    if (Date.now() - st.mtimeMs > lockout) fs.rmSync(lockFile);
  } catch {}

  while (fs.existsSync(lockFile)) {
    await new Promise((r) => setTimeout(r, 25));
  }
  fs.writeFileSync(lockFile, "1");
  try {
    return await fn();
  } finally {
    try {
      fs.rmSync(lockFile);
    } catch {}
  }
}

export async function resetTestDatabase({ seed = true } = {}) {
  return withResetLock(async () => {
    const databaseUrl = getDatabaseUrl();
    const sqlitePath = resolveSqlitePath(databaseUrl);

    // 0) ensure no client open
    try {
      await new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      }).$disconnect();
    } catch {}

    // 1) nuke DB + -wal/-shm
    if (sqlitePath) {
      for (const f of [sqlitePath, `${sqlitePath}-wal`, `${sqlitePath}-shm`]) {
        try {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        } catch {}
      }
      fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
    }

    console.info("[reset] generate");
    execSync(`npx prisma generate`, { stdio: "inherit" });

    console.info("[reset] db push");
    execSync(
      `DATABASE_URL=${databaseUrl} npx prisma db push --force-reset --skip-generate`,
      { stdio: "inherit", env: { ...process.env, DATABASE_URL: databaseUrl } },
    );

    // optional pragmas reduce transient locking
    try {
      const p = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
      await p.$executeRawUnsafe("PRAGMA journal_mode=WAL;");
      await p.$executeRawUnsafe("PRAGMA busy_timeout=5000;");
      await p.$disconnect();
    } catch {}

    if (seed) {
      console.info("[reset] seed");
      execSync(`DATABASE_URL=${databaseUrl} npx prisma db seed`, {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });
    }
    console.info("[reset] done");
  });
}

export function prismaTestClient() {
  return new PrismaClient({ datasources: { db: { url: getDatabaseUrl() } } });
}
