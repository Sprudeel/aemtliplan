import { defineEventHandler } from "h3";
import { requirePlanRole } from "../../../../utils/access";
import { groupDto } from "../../../../utils/plan-data";
import prisma from "../../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "viewer");
  const groups = await prisma.group.findMany({
    where: { planId },
    include: { members: true },
    orderBy: { name: "asc" },
  });
  return groups.map(groupDto);
});
