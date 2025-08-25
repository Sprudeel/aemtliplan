import prisma from '~/server/utils/prisma'
import { z } from 'zod'

const Body = z.object({
    name: z.string(),
    description: z.string(),
    icon: z.string(),
})

export default defineEventHandler(async (event) => {
    const { name, description, icon } = Body.parse(await readBody(event))


    try {
        return await prisma.job.create({
            data: {
                name,
                description,
                icon,
            },
        })
    } catch (e: any) {
        throw createError({ statusCode: 409, statusMessage: 'Job already exists' })
    }
})