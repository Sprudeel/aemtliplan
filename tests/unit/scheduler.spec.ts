import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, test } from "vitest";
import { ensurePlanSettings } from "~/server/utils/plan-data";
import prisma from "~/server/utils/prisma";
import { runDueRotations } from "~/server/utils/rotation-service";

afterAll(() => prisma.$disconnect());

/** Plan with 2 groups on 2 Ämtli, daily rotation due at `due`. */
async function duePlan(due: Date) {
  const planId = randomUUID();
  await prisma.plan.create({ data: { id: planId, name: "Lager", slug: `s-${planId}`, createdAt: new Date() } });
  await ensurePlanSettings(planId);
  await prisma.planSettings.update({
    where: { planId },
    data: { rotationEnabled: true, rotationTime: "17:00", nextRotationAt: due },
  });
  const [g1, g2] = await Promise.all(
    ["A", "B"].map((name) => prisma.group.create({ data: { planId, name } })),
  );
  const [j1, j2] = await Promise.all(
    [0, 1].map((position) => prisma.job.create({ data: { planId, name: `J${position}`, position } })),
  );
  await prisma.assignment.create({ data: { planId, jobId: j1!.id, groupId: g1!.id } });
  await prisma.assignment.create({ data: { planId, jobId: j2!.id, groupId: g2!.id } });
  return { planId, g1: g1!, g2: g2!, j1: j1! };
}

describe("runDueRotations", () => {
  test("rotates a due plan once and schedules the next run", async () => {
    const now = new Date("2026-11-02T16:00:30Z");
    const { planId, g2, j1 } = await duePlan(new Date("2026-11-02T16:00:00Z"));

    await runDueRotations(now);

    const assignment = await prisma.assignment.findUnique({ where: { jobId: j1.id } });
    expect(assignment?.groupId).toBe(g2.id);
    const logs = await prisma.rotationLog.findMany({ where: { planId } });
    expect(logs.map((log) => log.trigger)).toEqual(["schedule"]);
    const settings = await prisma.planSettings.findUniqueOrThrow({ where: { planId } });
    expect(settings.nextRotationAt?.toISOString()).toBe("2026-11-03T16:00:00.000Z");
  });

  test("missed runs (server was down 3 days) rotate only once", async () => {
    const { planId } = await duePlan(new Date("2026-10-30T16:00:00Z"));
    await runDueRotations(new Date("2026-11-02T08:00:00Z"));
    expect(await prisma.rotationLog.count({ where: { planId } })).toBe(1);
  });

  test("two instances ticking at once rotate only once", async () => {
    const now = new Date("2026-11-02T16:00:30Z");
    const { planId } = await duePlan(new Date("2026-11-02T16:00:00Z"));
    await Promise.all([runDueRotations(now), runDueRotations(now)]);
    expect(await prisma.rotationLog.count({ where: { planId } })).toBe(1);
  });

  test("plans that are not due or disabled are left alone", async () => {
    const { planId } = await duePlan(new Date("2026-11-05T16:00:00Z"));
    const disabled = await duePlan(new Date("2026-11-01T16:00:00Z"));
    await prisma.planSettings.update({ where: { planId: disabled.planId }, data: { rotationEnabled: false } });

    await runDueRotations(new Date("2026-11-02T16:00:30Z"));

    expect(await prisma.rotationLog.count({ where: { planId } })).toBe(0);
    expect(await prisma.rotationLog.count({ where: { planId: disabled.planId } })).toBe(0);
  });
});
