import { defineEventHandler, setResponseStatus } from "h3";
import { requirePlanRole } from "../../../../utils/access";
import { idParam, notFound } from "../../../../utils/errors";
import { ensurePlanSettings, markAssignmentsChanged } from "../../../../utils/plan-data";
import prisma from "../../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");
  const groupId = idParam(event, "groupId", "Group");

  // Members and assignments are removed by the database (cascade).
  const deleted = await prisma.group.deleteMany({ where: { id: groupId, planId } });
  if (deleted.count === 0) throw notFound("Group");

  await ensurePlanSettings(planId);
  await markAssignmentsChanged(planId, "groups");
  setResponseStatus(event, 204);
  return null;
});
