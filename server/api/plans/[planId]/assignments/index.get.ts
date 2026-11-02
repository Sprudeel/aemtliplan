import { defineEventHandler } from "h3";
import { requirePlanRole } from "../../../../utils/access";
import { groupDto } from "../../../../utils/plan-data";
import prisma from "../../../../utils/prisma";

// Every Ämtli in ring order with its group (null = nobody).
export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "viewer");
  const jobs = await prisma.job.findMany({
    where: { planId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true, assignment: { select: { group: { include: { members: true } } } } },
  });
  return jobs.map((job) => ({
    jobId: job.id,
    group: job.assignment ? groupDto(job.assignment.group) : null,
  }));
});
