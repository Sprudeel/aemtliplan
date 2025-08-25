import prisma from '~/server/utils/prisma'
import { z } from 'zod'

const Body = z.object({
    id: z.number().int(),
})

export default defineEventHandler(async (event) => {
    const {id} = Body.parse(await readBody(event))
    return prisma.job.delete({
        where: {
            id: id,
        },
    })
})