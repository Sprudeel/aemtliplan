import prisma from '~/server/utils/prisma'
import { z } from 'zod'

const Body = z.object({ jobId: z.number().int() })

export default defineEventHandler(async (event) => {
    const { jobId } = Body.parse(await readBody(event))
    return prisma.groupJob.delete({ where: { jobId } })
})