import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    return prisma.group.findMany({
        orderBy: { name: 'asc'},
        include: { members: true },
    })
})