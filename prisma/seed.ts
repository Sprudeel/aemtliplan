// Dev seed: one admin, one viewer, one plan with groups and Ämtli.
// Run: npm run db:seed  (needs DATABASE_URL and BETTER_AUTH_SECRET, see .env.example)
import { auth } from "../server/utils/auth";
import { ensurePlanSettings } from "../server/utils/plan-data";
import prisma from "../server/utils/prisma";

const PASSWORD = "password"; // dev only

async function createUser(email: string, name: string) {
  const { user } = await auth.api.signUpEmail({ body: { email, name, password: PASSWORD } });
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  return user;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");

  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();

  const admin = await createUser("admin@example.com", "Admin");
  const viewer = await createUser("viewer@example.com", "Viewer");

  const plan = await auth.api.createOrganization({
    body: { name: "Sommerlager 2026", slug: "sommerlager-2026", userId: admin.id },
  });
  if (!plan) throw new Error("plan not created");
  await prisma.planMembership.create({
    data: { id: crypto.randomUUID(), organizationId: plan.id, userId: viewer.id, role: "member", createdAt: new Date() },
  });
  await ensurePlanSettings(plan.id);

  const groups = [
    { name: "Gruppe 1", color: "#A81B00", members: ["Contenta", "Gecko"] },
    { name: "Gruppe 2", color: "#A88100", members: ["Clever", "Sueno"] },
    { name: "Gruppe 3", color: "#00A819", members: ["Xanadu", "Sprudel"] },
    { name: "Gruppe 4", color: "#0014A8", members: ["Pingu", "Luchs"] },
    { name: "Gruppe 5", color: "#A8009A", members: ["Fuchs"] },
  ];
  const createdGroups = [];
  for (const group of groups) {
    createdGroups.push(
      await prisma.group.create({
        data: {
          planId: plan.id,
          name: group.name,
          color: group.color,
          members: { create: group.members.map((name) => ({ name, planId: plan.id })) },
        },
      }),
    );
  }

  const jobs = [
    { name: "Küche", icon: "🍽️", description: "Spülen & Fläche putzen" },
    { name: "Toiletten", icon: "🧼", description: "Reinigen & auffüllen" },
    { name: "Haupthalle", icon: "🧹", description: "Putzen & Tische ordnen" },
    { name: "Holz", icon: "🪵", description: "Feuerholz sammeln" },
    { name: "Wasser", icon: "💧", description: "Kanister auffüllen" },
  ];
  for (const [position, job] of jobs.entries()) {
    const created = await prisma.job.create({ data: { planId: plan.id, position, ...job } });
    await prisma.assignment.create({
      data: { planId: plan.id, jobId: created.id, groupId: createdGroups[position]!.id },
    });
  }

  console.log("Seed complete: admin@example.com / viewer@example.com, password:", PASSWORD);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
