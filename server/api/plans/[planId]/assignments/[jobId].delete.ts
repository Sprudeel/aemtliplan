import { defineEventHandler, setResponseStatus } from "h3";
import { requirePlanRole } from "../../../../utils/access";
import { idParam, notFound } from "../../../../utils/errors";
import {
  ensurePlanSettings,
  loadSlots,
  lockPlan,
  markAssignmentsChanged,
  writeSlots,
} from "../../../../utils/plan-data";
import prisma from "../../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");
  const jobId = idParam(event, "jobId", "Ämtli");
  await ensurePlanSettings(planId);

  await prisma.$transaction(async (tx) => {
    await lockPlan(tx, planId);
    const before = await loadSlots(tx, planId);
    const slot = before.find((s) => s.jobId === jobId);
    if (!slot) throw notFound("Ämtli");
    if (slot.groupId === null) throw notFound("Assignment");
    const after = before.map((s) => (s.jobId === jobId ? { ...s, groupId: null } : s));
    await writeSlots(tx, planId, before, after);
  });

  await markAssignmentsChanged(planId, "assignment");
  setResponseStatus(event, 204);
  return null;
});
