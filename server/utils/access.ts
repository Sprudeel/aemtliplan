import { getRouterParam, type H3Event } from "h3";
import { auth } from "./auth";
import { apiError, notFound } from "./errors";
import prisma from "./prisma";

export type PlanRole = "viewer" | "admin";

/** better-auth stores roles as comma-separated list. owner/admin = Admin, member = Viewer. */
export function toPlanRole(storedRole: string): PlanRole {
  const roles = storedRole.split(",").map((role) => role.trim());
  return roles.includes("owner") || roles.includes("admin") ? "admin" : "viewer";
}

export async function requireSession(event: H3Event) {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw apiError(401, "UNAUTHORIZED", "Not signed in");
  return session;
}

/**
 * Every /api/plans/:planId route starts with this.
 * 401 no session · 404 plan missing or caller not a member (no leaking that it exists) · 403 role too low.
 */
export async function requirePlanRole(event: H3Event, minimum: PlanRole) {
  const session = await requireSession(event);
  const planId = getRouterParam(event, "planId");
  if (!planId) throw notFound("Plan");

  const membership = await prisma.planMembership.findFirst({
    where: { organizationId: planId, userId: session.user.id },
    include: { plan: true },
  });
  if (!membership) throw notFound("Plan");

  const role = toPlanRole(membership.role);
  if (minimum === "admin" && role !== "admin") {
    throw apiError(403, "FORBIDDEN", "Admin role required");
  }
  return { session, user: session.user, planId, plan: membership.plan, role };
}
