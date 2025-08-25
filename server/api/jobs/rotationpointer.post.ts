import prisma from '~/server/utils/prisma'
import { z } from 'zod'

const Body = z.object({ pointer: z.number().int() })

export default defineEventHandler(async (event) => {
    const id = Number(getRouterParam(event, 'id'))
    const { pointer } = Body.parse(await readBody(event))

    const ringLen = await prisma.group.count()
    if (ringLen === 0) throw createError({ statusCode: 400, statusMessage: 'No groups in ring' })

    const normalized = ((pointer % ringLen) + ringLen) % ringLen

    return await prisma.job.update({
        where: { id },
        data: { rotationPointer: normalized },
        select: { id: true, name: true, rotationPointer: true },
    })
})