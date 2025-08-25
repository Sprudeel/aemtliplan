import prisma from '~/server/utils/prisma'

export default defineEventHandler(async () => {
    return prisma.groupJob.findMany({
        include: { job: true, group: { include: { members: true } } },
        orderBy: [{ jobId: 'asc' }],
    })
})