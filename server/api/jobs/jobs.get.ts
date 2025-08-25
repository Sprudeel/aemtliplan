import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    return prisma.job.findMany({
        orderBy: { name: 'asc'},
    })
})