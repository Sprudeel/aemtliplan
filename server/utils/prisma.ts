import { PrismaClient } from '@prisma/client'

declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined
}

const prisma =
    globalThis.__prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

// Optional: set SQLite pragmas once (safe to keep — quick & improves concurrency)
async function init() {
    try {
        await prisma.$executeRawUnsafe('PRAGMA journal_mode=WAL;')
        await prisma.$executeRawUnsafe('PRAGMA busy_timeout=5000;')
    } catch {
        // ignore if not SQLite / or already set
    }
}
init()

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma
}

export default prisma