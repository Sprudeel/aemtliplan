import { defineEventHandler, setResponseStatus } from "h3";
import { JobCreate } from "../../../../../shared/schemas";
import { requirePlanRole } from "../../../../utils/access";
import { parseBody } from "../../../../utils/errors";
import { jobConflict } from "../../../../utils/jobs";
import { ensurePlanSettings, jobDto, lockPlan } from "../../../../utils/plan-data";
import { emitPlanChanged } from "../../../../utils/plan-events";
import prisma from "../../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");
  const body = await parseBody(event, JobCreate);
  await ensurePlanSettings(planId);

  const job = await prisma
    .$transaction(async (tx) => {
      await lockPlan(tx, planId);
      // New Ämtli go to the end of the ring.
      const last = await tx.job.aggregate({ where: { planId }, _max: { position: true } });
      return tx.job.create({
        data: {
          planId,
          name: body.name,
          icon: body.icon || null,
          description: body.description || null,
          position: (last._max.position ?? -1) + 1,
        },
      });
    })
    .catch(jobConflict);

  emitPlanChanged(planId, "jobs");
  setResponseStatus(event, 201);
  return jobDto(job);
});
