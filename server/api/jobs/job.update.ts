import prisma from '~/server/utils/prisma'
import { z } from 'zod'

const Body = z.object({
    id: z.int(),
    name: z.string(),
    description: z.string(),
    icon: z.string(),
})

export default defineEventHandler(async (event) => {
    const { id, name, description, icon } = Body.parse(await readBody(event))


    return prisma.job.update({
        where: {
            id: id,
        },
        data: {
            name: name,
            description: description,
            icon: icon,
        },
    })
})