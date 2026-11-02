import { defineEventHandler } from "h3";
import { JobUpdate } from "../../../../../shared/schemas";
import { requirePlanRole } from "../../../../utils/access";
import { idParam, notFound, parseBody } from "../../../../utils/errors";
import { jobConflict } from "../../../../utils/jobs";
import { jobDto } from "../../../../utils/plan-data";
import { emitPlanChanged } from "../../../../utils/plan-events";
import prisma from "../../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");
  const jobId = idParam(event, "jobId", "Ämtli");
  const body = await parseBody(event, JobUpdate);

  const existing = await prisma.job.findFirst({ where: { id: jobId, planId }, select: { id: true } });
  if (!existing) throw notFound("Ämtli");

  const job = await prisma.job
    .update({
      where: { id: jobId },
      data: {
        name: body.name,
        icon: body.icon === undefined ? undefined : body.icon || null,
        description: body.description === undefined ? undefined : body.description || null,
      },
    })
    .catch(jobConflict);

  emitPlanChanged(planId, "jobs");
  return jobDto(job);
});
