import prisma from '~/server/utils/prisma'
import { z } from 'zod'

const Body = z.object({ jobIds: z.array(z.number().int()).optional(), step: z.number().int().min(1).default(1) })

export default defineEventHandler(async (event) => {
    const { jobIds, step } = Body.parse(await readBody(event))

    const ring = await prisma.group.findMany({ orderBy: { rotationIndex: 'asc' }, select: { id: true } })
    const ids = ring.map(r => r.id)
    const N = ids.length
    if (N === 0) throw createError({ statusCode: 400, statusMessage: 'No groups in ring' })

    const jobs = jobIds?.length
        ? await prisma.job.findMany({ where: { id: { in: jobIds } }, select: { id: true, rotationPointer: true } })
        : await prisma.job.findMany({ select: { id: true, rotationPointer: true } })

    const updates = jobs.map(j => {
        const nextPointer = (j.rotationPointer + step) % N
        return { jobId: j.id, pointer: nextPointer, groupId: ids[nextPointer] }
    })

    await prisma.$transaction([
        ...updates.map(u => prisma.job.update({ where: { id: u.jobId }, data: { rotationPointer: u.pointer } })),
        ...updates.map(u => prisma.groupJob.upsert({ where: { jobId: u.jobId }, create: { jobId: u.jobId, groupId: u.groupId }, update: { groupId: u.groupId } })),
    ])

    return { updated: jobs.length }
})