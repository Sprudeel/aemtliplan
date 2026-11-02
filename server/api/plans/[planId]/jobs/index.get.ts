import { defineEventHandler } from "h3";
import { requirePlanRole } from "../../../../utils/access";
import { jobDto } from "../../../../utils/plan-data";
import prisma from "../../../../utils/prisma";

// Ämtli in ring order.
export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "viewer");
  const jobs = await prisma.job.findMany({
    where: { planId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  return jobs.map(jobDto);
});
