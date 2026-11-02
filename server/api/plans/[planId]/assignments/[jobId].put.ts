import { defineEventHandler } from "h3";
import { AssignmentPut } from "../../../../../shared/schemas";
import { requirePlanRole } from "../../../../utils/access";
import { apiError, idParam, notFound, parseBody } from "../../../../utils/errors";
import {
  ensurePlanSettings,
  groupDto,
  loadSlots,
  lockPlan,
  markAssignmentsChanged,
  writeSlots,
} from "../../../../utils/plan-data";
import prisma from "../../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");
  const jobId = idParam(event, "jobId", "Ämtli");
  const { groupId } = await parseBody(event, AssignmentPut);
  await ensurePlanSettings(planId);

  const group = await prisma.$transaction(async (tx) => {
    await lockPlan(tx, planId);
    const job = await tx.job.findFirst({ where: { id: jobId, planId }, select: { id: true } });
    if (!job) throw notFound("Ämtli");
    const target = await tx.group.findFirst({ where: { id: groupId, planId }, include: { members: true } });
    if (!target) throw notFound("Group");
    if (!target.inRotation) {
      throw apiError(400, "GROUP_NOT_IN_ROTATION", "This group is not in the rotation");
    }
    const before = await loadSlots(tx, planId);
    const after = before.map((slot) => (slot.jobId === jobId ? { ...slot, groupId } : slot));
    await writeSlots(tx, planId, before, after);
    return target;
  });

  await markAssignmentsChanged(planId, "assignment");
  return { jobId, group: groupDto(group) };
});
