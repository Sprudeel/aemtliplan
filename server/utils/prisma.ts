import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// Optional: set SQLite pragmas once (safe to keep — improves concurrency)
async function init() {
    try {
        await prisma.$executeRaw`PRAGMA journal_mode = WAL;`
        await prisma.$executeRaw`PRAGMA busy_timeout = 5000;`
    } catch (err) {
        // Ignore if not SQLite or pragmas already set
        console.warn("Skipping SQLite pragmas:", err instanceof Error ? err.message : err)
    }
}
// init();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export default prisma;
