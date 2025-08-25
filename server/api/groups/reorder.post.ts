import prisma from '~/server/utils/prisma'
import { z } from 'zod'

const Body = z.object({ order: z.array(z.number().int()).nonempty() }) // [groupId...]

export default defineEventHandler(async (event) => {
    const { order } = Body.parse(await readBody(event))
    const existing = new Set((await prisma.group.findMany({ where: { id: { in: order } }, select: { id: true } })).map(g => g.id))
    if (order.some(id => !existing.has(id))) throw createError({ statusCode: 400, statusMessage: 'Unknown groupId in order' })

    await prisma.$transaction(order.map((id, idx) => prisma.group.update({ where: { id }, data: { rotationIndex: idx } })))
    return { ok: true, count: order.length }
})