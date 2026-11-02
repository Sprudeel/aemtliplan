import { defineEventHandler } from "h3";
import { requirePlanRole } from "../../../utils/access";
import { groupDto, jobDto } from "../../../utils/plan-data";
import prisma from "../../../utils/prisma";

// My role, my group and my Ämtli in this plan.
export default defineEventHandler(async (event) => {
  const { planId, role, user } = await requirePlanRole(event, "viewer");

  // Link a pending member invitation to this account on first visit.
  await prisma.member.updateMany({
    where: { planId, userId: null, inviteEmail: user.email.toLowerCase() },
    data: { userId: user.id, inviteEmail: null },
  });

  const member = await prisma.member.findFirst({
    where: { planId, userId: user.id },
    include: {
      group: {
        include: {
          members: true,
          assignments: { include: { job: true }, orderBy: { job: { position: "asc" } } },
        },
      },
    },
  });

  return {
    role,
    member: member ? { id: member.id, name: member.name } : null,
    group: member ? groupDto(member.group) : null,
    jobs: member ? member.group.assignments.map((assignment) => jobDto(assignment.job)) : [],
  };
});
