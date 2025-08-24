import prisma from '~/server/utils/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createSession } from '~/server/utils/auth'

const Body = z.object({ email: z.string().email(), password: z.string().min(8) })

export default defineEventHandler(async (event) => {
    const { email, password } = Body.parse(await readBody(event))
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
    await createSession(event, user.id)
    return { id: user.id, email: user.email, name: user.name, role: user.role }
})