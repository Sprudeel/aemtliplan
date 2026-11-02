import { defineEventHandler, setResponseStatus } from "h3";
import { requirePlanRole } from "../../../../utils/access";
import { idParam, notFound } from "../../../../utils/errors";
import { compactJobPositions } from "../../../../utils/jobs";
import { ensurePlanSettings, lockPlan, markAssignmentsChanged, syncIdleSince } from "../../../../utils/plan-data";
import prisma from "../../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");
  const jobId = idParam(event, "jobId", "Ämtli");
  await ensurePlanSettings(planId);

  await prisma.$transaction(async (tx) => {
    await lockPlan(tx, planId);
    const deleted = await tx.job.deleteMany({ where: { id: jobId, planId } });
    if (deleted.count === 0) throw notFound("Ämtli");
    await compactJobPositions(tx, planId);
    await syncIdleSince(tx, planId); // its group may now be idle
  });

  await markAssignmentsChanged(planId, "jobs");
  setResponseStatus(event, 204);
  return null;
});
