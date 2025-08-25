import prisma from '~/server/utils/prisma'
import { z } from 'zod'

const Body = z.object({
    name: z.string(),
    members: z.array(z.string()).min(1).max(100),
})

export default defineEventHandler(async (event) => {
    const { name, members } = Body.parse(await readBody(event))

    const uniqMembers = Array.from(new Set(members.filter(Boolean)))
    
    // Create the group
    try {
        return await prisma.group.create({
            data: {
                name,
                members: {
                    create: uniqMembers.map((m) => ({ name: m }))
                }
            },
            include: { members: true }
        })
    } catch (e: any) {
        throw createError({ statusCode: 409, statusMessage: 'Group already exists' })
    }
})