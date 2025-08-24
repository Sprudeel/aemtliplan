import prisma from '~/server/utils/prisma'

export default defineEventHandler(async () => {
    const userCount = await prisma.user.count()
    return { initialized: userCount > 0 }
})