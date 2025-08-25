import prisma from '~/server/utils/prisma'
import { z } from 'zod'

const Body = z.object({
    id: z.int(),
    name: z.string(),
    members: z.array(z.string()).min(1).max(100),
})

export default defineEventHandler(async (event) => {
    const { id, name, members } = Body.parse(await readBody(event))
    const uniqMembers = Array.from(new Set(members.filter(Boolean)))


    return prisma.group.update({
        where: {
            id: id,
        },
        data: {
            name: name,
            members: {
                deleteMany: {},
                create: uniqMembers.map((m) => ({ name: m }))
            },
        },
        include: { members: true },
    })
})