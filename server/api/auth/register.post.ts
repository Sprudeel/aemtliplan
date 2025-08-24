import prisma from '~/server/utils/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createSession, requireAdmin } from '~/server/utils/auth'

const Body = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().trim().min(1),
    role: z.enum(['ADMIN', 'USER']).optional() // admin can choose; ignored during bootstrap
})

export default defineEventHandler(async (event) => {
    const { email, password, name, role } = Body.parse(await readBody(event))
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw createError({ statusCode: 409, statusMessage: 'Email already registered' })

    const userCount = await prisma.user.count()
    const passwordHash = await bcrypt.hash(password, 12)

    if (userCount === 0) {
        // Bootstrap: first user becomes ADMIN; auto-login.
        const user = await prisma.user.create({ data: { email, password: passwordHash, name, role: 'ADMIN' } })
        await createSession(event, user.id)
        return { id: user.id, email: user.email, name: user.name, role: user.role }
    }

    // Post-bootstrap: only admins can register new users.
    await requireAdmin(event)
    const user = await prisma.user.create({ data: { email, password: passwordHash, name, role: role ?? 'USER' } })
    return { id: user.id, email: user.email, name: user.name, role: user.role }
})