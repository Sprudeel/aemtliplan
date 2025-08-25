// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    await prisma.jobPlacement.deleteMany()
    await prisma.groupJob.deleteMany()
    await prisma.member.deleteMany()
    await prisma.group.deleteMany()
    await prisma.job.deleteMany()
    await prisma.session.deleteMany()
    await prisma.user.deleteMany()

    // User (Admin)
    const admin = await prisma.user.create({
        data: {
            email: 'admin@example.com',
            name: 'Admin',
            password: 'password',
            role: 'ADMIN',
        },
    })

    // Gruppen mit rotationIndex (Ring)
    const groups = await prisma.$transaction([
        prisma.group.create({ data: { name: 'Gruppe 1', rotationIndex: 0, color: '#C9E4DE' } }),
        prisma.group.create({ data: { name: 'Gruppe 2', rotationIndex: 1, color: '#C6DEF1'  } }),
        prisma.group.create({ data: { name: 'Gruppe 3', rotationIndex: 2, color: '#FAEDCB'  } }),
    ])

    // Mitglieder
    await prisma.member.createMany({
        data: [
            { name: 'Contenta', groupId: groups[0].id },
            { name: 'Gecko', groupId: groups[0].id },
            { name: 'Clever', groupId: groups[1].id },
            { name: 'Sueno', groupId: groups[1].id },
            { name: 'Xanadu', groupId: groups[2].id },
            { name: 'Sprudel', groupId: groups[2].id },
        ],
    })

    // Jobs
    const jobs = await prisma.$transaction([
        prisma.job.create({
            data: { name: 'Küche', icon: '🍽️', description: 'Spülen & Fläche putzen', rotationPointer: 0 },
        }),
        prisma.job.create({
            data: { name: 'Toiletten', icon: '🧼', description: 'Reinigen & auffüllen', rotationPointer: 1 },
        }),
        prisma.job.create({
            data: { name: 'Haupthalle', icon: '🧹', description: 'Putzen & Tische ordnen', rotationPointer: 2 },
        }),
    ])

    // Aktuelle Zuordnungen (GroupJob) nach rotationPointer
    const ring = (await prisma.group.findMany({ orderBy: { rotationIndex: 'asc' }, select: { id: true } }))
        .map(g => g.id)

    await prisma.$transaction(
        jobs.map(job => {
            const groupId = ring[job.rotationPointer % ring.length]
            return prisma.groupJob.upsert({
                where: { jobId: job.id },
                create: { jobId: job.id, groupId },
                update: { groupId },
            })
        })
    )

    // Platzierungen fürs UI (JobPlacement)
    await prisma.jobPlacement.createMany({
        data: [
            { jobId: jobs[0].id, row: 1, col: 1 },
            { jobId: jobs[1].id, row: 1, col: 2 },
            { jobId: jobs[2].id, row: 2, col: 1, colSpan: 2 },
        ],
    })

    console.log('🌱 Seed complete')
    console.log('Admin login: admin@example.com / password')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })