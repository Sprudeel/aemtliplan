import { defineEventHandler } from "h3";
import { JobOrder } from "../../../../../shared/schemas";
import { requirePlanRole } from "../../../../utils/access";
import { apiError, parseBody } from "../../../../utils/errors";
import { ensurePlanSettings, jobDto, lockPlan } from "../../../../utils/plan-data";
import { emitPlanChanged } from "../../../../utils/plan-events";
import prisma from "../../../../utils/prisma";

// Sets the ring order. `jobIds` must contain every Ämtli of the plan exactly once.
export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");
  const { jobIds } = await parseBody(event, JobOrder);
  await ensurePlanSettings(planId);

  const jobs = await prisma.$transaction(async (tx) => {
    await lockPlan(tx, planId);
    const existing = await tx.job.findMany({ where: { planId }, select: { id: true } });
    const existingIds = new Set(existing.map((job) => job.id));
    const isPermutation =
      jobIds.length === existingIds.size &&
      new Set(jobIds).size === jobIds.length &&
      jobIds.every((id) => existingIds.has(id));
    if (!isPermutation) {
      throw apiError(400, "ORDER_MISMATCH", "jobIds must list every Ämtli of the plan exactly once");
    }
    for (const [position, id] of jobIds.entries()) {
      await tx.job.update({ where: { id }, data: { position } });
    }
    return tx.job.findMany({ where: { planId }, orderBy: { position: "asc" } });
  });

  emitPlanChanged(planId, "jobs");
  return jobs.map(jobDto);
});
