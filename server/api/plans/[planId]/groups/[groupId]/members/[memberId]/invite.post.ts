import { defineEventHandler, setResponseStatus } from "h3";
import { MemberInvite } from "../../../../../../../../shared/schemas";
import { requirePlanRole } from "../../../../../../../utils/access";
import { auth } from "../../../../../../../utils/auth";
import { apiError, idParam, notFound, parseBody } from "../../../../../../../utils/errors";
import { ensurePlanSettings } from "../../../../../../../utils/plan-data";
import prisma from "../../../../../../../utils/prisma";

// Invites a group member to log in (as viewer). The member is linked to the
// account when that user first opens GET /api/plans/:planId/me.
export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");
  const groupId = idParam(event, "groupId", "Group");
  const memberId = idParam(event, "memberId", "Member");
  const { email } = await parseBody(event, MemberInvite);

  const settings = await ensurePlanSettings(planId);
  if (!settings.memberLogin) {
    throw apiError(403, "MEMBER_LOGIN_DISABLED", "Member login is turned off for this plan");
  }

  const member = await prisma.member.findFirst({ where: { id: memberId, groupId, planId } });
  if (!member) throw notFound("Member");
  if (member.userId) throw apiError(409, "MEMBER_HAS_LOGIN", "Member already has a login");

  const invitation = await auth.api.createInvitation({
    headers: event.headers,
    body: { email, role: "member", organizationId: planId },
  });
  await prisma.member.update({ where: { id: member.id }, data: { inviteEmail: email.toLowerCase() } });

  setResponseStatus(event, 201);
  return { invitationId: invitation?.id ?? null, email };
});
