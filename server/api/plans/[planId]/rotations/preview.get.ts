import { defineEventHandler } from "h3";
import { RotationPreviewQuery } from "../../../../../shared/schemas";
import { requirePlanRole } from "../../../../utils/access";
import { parseQuery } from "../../../../utils/errors";
import { groupDto } from "../../../../utils/plan-data";
import prisma from "../../../../utils/prisma";
import { previewRotation } from "../../../../utils/rotation-service";

// What the next rotation would do (nothing is saved).
export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "viewer");
  const { steps } = parseQuery(event, RotationPreviewQuery);
  const preview = await previewRotation(planId, steps);

  const groups = await prisma.group.findMany({ where: { planId }, include: { members: true } });
  const byId = new Map(groups.map((group) => [group.id, groupDto(group)]));
  const pick = (id: number | null) => (id === null ? null : (byId.get(id) ?? null));

  return preview.map((entry) => ({
    jobId: entry.jobId,
    current: pick(entry.currentGroupId),
    next: pick(entry.nextGroupId),
  }));
});
