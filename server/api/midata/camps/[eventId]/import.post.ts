import { randomBytes } from "node:crypto";
import { defineEventHandler, getRouterParam, setResponseStatus } from "h3";
import { requireSession } from "../../../../utils/access";
import { auth } from "../../../../utils/auth";
import { apiError, notFound } from "../../../../utils/errors";
import { getMidataCamp, listMidataParticipants, uniqueNames } from "../../../../utils/midata";
import { requireMidataToken } from "../../../../utils/midata-access";
import { ensurePlanSettings } from "../../../../utils/plan-data";
import prisma from "../../../../utils/prisma";

const IMPORT_GROUP = "MiData-Import";

function slugify(text: string) {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "lager"}-${randomBytes(3).toString("hex")}`;
}

/**
 * Creates a plan from a MiData camp. The caller becomes its owner. All participants
 * land in one group "MiData-Import" (not in rotation) for the admin to split up.
 */
export default defineEventHandler(async (event) => {
  await requireSession(event);
  const token = await requireMidataToken(event);
  const eventId = getRouterParam(event, "eventId") ?? "";

  let camp, participants: string[];
  try {
    camp = await getMidataCamp(token, eventId);
    participants = camp ? await listMidataParticipants(token, eventId) : [];
  } catch (error) {
    console.error("[midata] import failed", error);
    throw apiError(502, "MIDATA_UNAVAILABLE", "MiData could not be reached");
  }
  if (!camp) throw notFound("Camp");

  const existing = await prisma.planSettings.findFirst({
    where: { midataEventId: eventId, plan: { memberships: { some: {} } } },
    select: { planId: true },
  });
  if (existing) {
    throw apiError(409, "CAMP_ALREADY_IMPORTED", "This camp already has a plan", { planId: existing.planId });
  }

  const plan = await auth.api.createOrganization({
    headers: event.headers,
    body: { name: camp.name, slug: slugify(camp.name) },
  });
  if (!plan) throw apiError(500, "PLAN_CREATE_FAILED", "Plan could not be created");

  await ensurePlanSettings(plan.id);
  await prisma.planSettings.update({ where: { planId: plan.id }, data: { midataEventId: eventId } });

  const names = uniqueNames(participants);
  if (names.length) {
    await prisma.group.create({
      data: {
        planId: plan.id,
        name: IMPORT_GROUP,
        inRotation: false,
        members: { create: names.map((name) => ({ name, planId: plan.id })) },
      },
    });
  }

  setResponseStatus(event, 201);
  return { planId: plan.id, name: plan.name, importedMembers: names.length };
});
