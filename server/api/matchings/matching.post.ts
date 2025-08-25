import prisma from '~/server/utils/prisma'
import { z } from 'zod'

const Body = z.object({ jobId: z.number().int(), groupId: z.number().int() })

export default defineEventHandler(async (event) => {
    const { jobId, groupId } = Body.parse(await readBody(event))
    // upsert by jobId
    return prisma.groupJob.upsert({
        where: { jobId },
        create: { jobId, groupId },
        update: { groupId },
        include: { job: true, group: true },
    })
})