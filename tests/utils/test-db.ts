import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

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

async function withResetLock<T>(fn: () => Promise<T>) {
  const lockDir = path.resolve(".tmp");
  const lockFile = path.join(lockDir, "db-reset.lock");
  fs.mkdirSync(lockDir, { recursive: true });
  while (fs.existsSync(lockFile)) {
    await new Promise((r) => setTimeout(r, 20));
  }
  fs.writeFileSync(lockFile, "1");
  try {
    return await fn();
  } finally {
    fs.rmSync(lockFile);
  }
}

export async function resetTestDatabase({ seed = true } = {}) {
  return withResetLock(async () => {
    const databaseUrl = getDatabaseUrl();
    const sqlitePath = resolveSqlitePath(databaseUrl);

    // 0) make sure no client is open in this process
    try {
      const tmp = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      });
      await tmp.$disconnect();
    } catch {}

    // 1) nuke DB file + WAL/SHM sidecars (if any)
    if (sqlitePath) {
      const wal = `${sqlitePath}-wal`;
      const shm = `${sqlitePath}-shm`;
      for (const f of [sqlitePath, wal, shm]) {
        try {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        } catch {}
      }
      fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
    }

    // 2) generate client
    execSync(`npx prisma generate`, { stdio: "inherit" });

    // 3) recreate schema against THIS worker DB (force reset)
    execSync(
      `DATABASE_URL=${databaseUrl} npx prisma db push --force-reset --skip-generate`,
      { stdio: "inherit", env: { ...process.env, DATABASE_URL: databaseUrl } },
    );

    // 4) (optional) set WAL + busy_timeout immediately to reduce transient locks
    try {
      const p = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
      await p.$executeRawUnsafe("PRAGMA journal_mode=WAL;");
      await p.$executeRawUnsafe("PRAGMA busy_timeout=5000;");
      await p.$disconnect();
    } catch {}

    // 5) seed (must be idempotent)
    if (seed) {
      execSync(`DATABASE_URL=${databaseUrl} npx prisma db seed`, {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });
    }
  });
}

export function prismaTestClient() {
  return new PrismaClient({
    datasources: { db: { url: getDatabaseUrl() } },
  });
}
