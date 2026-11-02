import { defineEventHandler, setResponseStatus } from "h3";
import { GroupCreate } from "../../../../../shared/schemas";
import { requirePlanRole } from "../../../../utils/access";
import { parseBody } from "../../../../utils/errors";
import { assertMembersFree, cleanMemberNames, groupConflict } from "../../../../utils/groups";
import {
  ensurePlanSettings,
  groupDto,
  lockPlan,
  markAssignmentsChanged,
  placeGroupInFreeSlot,
  syncIdleSince,
} from "../../../../utils/plan-data";
import prisma from "../../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");
  const body = await parseBody(event, GroupCreate);
  const members = cleanMemberNames(body.members);
  await assertMembersFree(prisma, planId, members, null);
  await ensurePlanSettings(planId);

  const group = await prisma
    .$transaction(async (tx) => {
      await lockPlan(tx, planId);
      const created = await tx.group.create({
        data: {
          planId,
          name: body.name,
          color: body.color,
          inRotation: body.inRotation,
          members: { create: members.map((name) => ({ name, planId })) },
        },
      });
      // A new group in rotation takes the first free Ämtli, if any.
      if (created.inRotation) await placeGroupInFreeSlot(tx, planId, created.id);
      await syncIdleSince(tx, planId);
      return tx.group.findUniqueOrThrow({ where: { id: created.id }, include: { members: true } });
    })
    .catch(groupConflict);

  await markAssignmentsChanged(planId, "groups");
  setResponseStatus(event, 201);
  return groupDto(group);
});
