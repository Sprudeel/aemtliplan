import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const TEST_DB_URL = 'file:./test.db'

export async function resetTestDatabase({ seed = true } = {}) {
    // 1) delete test db file (clean slate)
    try { if (fs.existsSync('test.db')) fs.unlinkSync('test.db') } catch {}

    // 2) make sure Prisma client is generated (in case schema changed)
    execSync('npx prisma generate', { stdio: 'inherit' })

    // 3) push schema to test DB (no migrations needed)
    execSync('npx prisma db push', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    })

    // 4) (optional) seed
    if (seed) {
        execSync('npx prisma db seed', {
            stdio: 'inherit',
            env: { ...process.env, DATABASE_URL: TEST_DB_URL },
        })
    }
}

export function prismaTestClient() {
    return new PrismaClient({
        datasources: { db: { url: 'file:./test.db' } },
    })
}