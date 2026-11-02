import { defineEventHandler } from "h3";
import { GroupUpdate } from "../../../../../shared/schemas";
import { requirePlanRole } from "../../../../utils/access";
import { idParam, notFound, parseBody } from "../../../../utils/errors";
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
  const groupId = idParam(event, "groupId", "Group");
  const body = await parseBody(event, GroupUpdate);

  const existing = await prisma.group.findFirst({ where: { id: groupId, planId }, include: { members: true } });
  if (!existing) throw notFound("Group");

  const names = body.members ? cleanMemberNames(body.members) : null;
  if (names) await assertMembersFree(prisma, planId, names, groupId);
  await ensurePlanSettings(planId);

  const leavesRotation = existing.inRotation && body.inRotation === false;
  const joinsRotation = !existing.inRotation && body.inRotation === true;

  const group = await prisma
    .$transaction(async (tx) => {
      await lockPlan(tx, planId);
      await tx.group.update({
        where: { id: groupId },
        data: { name: body.name, color: body.color, inRotation: body.inRotation },
      });

      if (names) {
        // Keep members that stay (their login link survives), remove the rest, add new ones.
        const wanted = new Set(names.map((name) => name.toLocaleLowerCase("de")));
        const kept = existing.members.filter((m) => wanted.has(m.name.toLocaleLowerCase("de")));
        const keptKeys = new Set(kept.map((m) => m.name.toLocaleLowerCase("de")));
        await tx.member.deleteMany({
          where: { groupId, id: { notIn: kept.map((m) => m.id) } },
        });
        await tx.member.createMany({
          data: names
            .filter((name) => !keptKeys.has(name.toLocaleLowerCase("de")))
            .map((name) => ({ name, planId, groupId })),
        });
      }

      if (leavesRotation) await tx.assignment.deleteMany({ where: { groupId } });
      // Back from a break: take the first free Ämtli (else wait as idle group).
      if (joinsRotation) await placeGroupInFreeSlot(tx, planId, groupId);
      await syncIdleSince(tx, planId);

      return tx.group.findUniqueOrThrow({ where: { id: groupId }, include: { members: true } });
    })
    .catch(groupConflict);

  await markAssignmentsChanged(planId, "groups");
  return groupDto(group);
});
