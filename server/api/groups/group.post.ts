import prisma from '~/server/utils/prisma'
import { z } from 'zod'

const Body = z.object({
    name: z.string().trim().min(1, 'Name required'),
    members: z.array(z.string().trim().min(1)).min(1).max(100),
    color: z.string().default("#000000"),
})

export default defineEventHandler(async (event) => {
    const { name, members, color } = Body.parse(await readBody(event))
    const uniqMembers = Array.from(new Set(members.filter(Boolean)))

    // compute next rotationIndex (append to the ring)
    const agg = await prisma.group.aggregate({ _max: { rotationIndex: true } })
    const rotationIndex = ((agg._max.rotationIndex ?? -1) + 1)

    try {
        return await prisma.group.create({
            data: {
                name,
                rotationIndex,
                color,
                members: { create: uniqMembers.map((m) => ({ name: m })) },
            },
            include: { members: true },
        })
    } catch (e: any) {
        // likely unique constraint on name
        throw createError({ statusCode: 409, statusMessage: 'Group already exists' })
    }
})