import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.groupJob.deleteMany();
  await prisma.member.deleteMany();
  await prisma.group.deleteMany();
  await prisma.job.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  // bcrypt hash for password
  const password: string = await bcrypt.hash("password", 12);

  // User (Admin)
  await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin",
      password: password,
      role: "ADMIN",
    },
  });

  // Gruppen mit rotationIndex (Ring)
  const groups = await prisma.$transaction([
    prisma.group.create({
      data: {
        name: "Gruppe 1",
        rotationIndex: 0,
        color: "#A81B00",
        inRotation: true,
      },
    }),
    prisma.group.create({
      data: {
        name: "Gruppe 2",
        rotationIndex: 1,
        color: "#A88100",
        inRotation: true,
      },
    }),
    prisma.group.create({
      data: {
        name: "Gruppe 3",
        rotationIndex: 2,
        color: "#00A819",
        inRotation: true,
      },
    }),
    prisma.group.create({
      data: {
        name: "Gruppe 4",
        rotationIndex: 3,
        color: "#0014A8",
        inRotation: true,
      },
    }),
    prisma.group.create({
      data: {
        name: "Gruppe 5",
        rotationIndex: 4,
        color: "#A8009A",
        inRotation: true,
      },
    }),
  ]);

  // Mitglieder
  await prisma.member.createMany({
    data: [
      { name: "Contenta", groupId: groups[0].id },
      { name: "Gecko", groupId: groups[0].id },
      { name: "Clever", groupId: groups[1].id },
      { name: "Sueno", groupId: groups[1].id },
      { name: "Xanadu", groupId: groups[2].id },
      { name: "Sprudel", groupId: groups[2].id },
      { name: "Contenta", groupId: groups[3].id },
      { name: "Gecko", groupId: groups[3].id },
      { name: "Sueno", groupId: groups[4].id },
    ],
  });

  // Jobs
  const jobs = await prisma.$transaction([
    prisma.job.create({
      data: {
        name: "Küche",
        icon: "🍽️",
        description: "Spülen & Fläche putzen",
        rotationPointer: 0,
      },
    }),
    prisma.job.create({
      data: {
        name: "Toiletten",
        icon: "🧼",
        description: "Reinigen & auffüllen",
        rotationPointer: 1,
      },
    }),
    prisma.job.create({
      data: {
        name: "Haupthalle",
        icon: "🧹",
        description: "Putzen & Tische ordnen",
        rotationPointer: 2,
      },
    }),
    prisma.job.create({
      data: {
        name: "Testing",
        icon: "🧹",
        description: "Putzen & Tische ordnen",
        rotationPointer: 3,
      },
    }),
    prisma.job.create({
      data: {
        name: "Testing2",
        icon: "🧹",
        description: "Putzen & Tische ordnen",
        rotationPointer: 4,
      },
    }),
  ]);

  // Aktuelle Zuordnungen (GroupJob) nach rotationPointer
  const ring = (
    await prisma.group.findMany({
      orderBy: { rotationIndex: "asc" },
      select: { id: true },
    })
  ).map((g) => g.id);

  await prisma.$transaction(
    jobs.map((job) => {
      const groupId = ring[job.rotationPointer % ring.length];
      return prisma.groupJob.upsert({
        where: { jobId: job.id },
        create: { jobId: job.id, groupId },
        update: { groupId },
      });
    }),
  );

  console.log("🌱 Seed complete");
  console.log("Admin login: admin@example.com / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
