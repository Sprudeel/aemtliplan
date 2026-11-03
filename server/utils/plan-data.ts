import { randomBytes } from "node:crypto";
import type { Group, Job, Member, PlanSettings, Prisma, PrismaClient } from "@prisma/client";
import { isUniqueViolation } from "./errors";
import { emitPlanChanged, type PlanChange } from "./plan-events";
import prisma from "./prisma";
import { fillFirstFreeSlot, type Slot } from "./rotation-engine";

export type Db = PrismaClient | Prisma.TransactionClient;

// ---------- settings ----------

/** Settings row is created lazily on first access (plans are created by better-auth). */
export async function ensurePlanSettings(planId: string, db: Db = prisma): Promise<PlanSettings> {
  const existing = await db.planSettings.findUnique({ where: { planId } });
  if (existing) return existing;
  try {
    return await db.planSettings.create({
      data: { planId, publicSlug: randomBytes(12).toString("base64url") },
    });
  } catch (error) {
    // Two requests for a brand-new plan can race here; the other one created the row.
    if (isUniqueViolation(error)) return db.planSettings.findUniqueOrThrow({ where: { planId } });
    throw error;
  }
}

/** Serializes rotations, undo and manual assignment changes of one plan. */
export async function lockPlan(tx: Prisma.TransactionClient, planId: string) {
  await tx.$executeRaw`SELECT 1 FROM "PlanSettings" WHERE "planId" = ${planId} FOR UPDATE`;
}

export async function markAssignmentsChanged(planId: string, reason: PlanChange["reason"]) {
  await prisma.planSettings.update({
    where: { planId },
    data: { assignmentsChangedAt: new Date() },
  });
  emitPlanChanged(planId, reason);
}

// ---------- response shapes ----------

export const fileUrl = (key: string) => `/api/files/${key}`;

export function settingsDto(settings: PlanSettings) {
  return {
    timezone: settings.timezone,
    rotationEnabled: settings.rotationEnabled,
    rotationTime: settings.rotationTime,
    idlePolicy: settings.idlePolicy,
    visibility: settings.visibility,
    publicSlug: settings.publicSlug,
    showMemberNames: settings.showMemberNames,
    memberLogin: settings.memberLogin,
    backgroundUrl: settings.backgroundKey ? fileUrl(settings.backgroundKey) : null,
  };
}

type GroupWithMembers = Group & { members: Member[] };

export function groupDto(group: GroupWithMembers) {
  return {
    id: group.id,
    name: group.name,
    color: group.color,
    inRotation: group.inRotation,
    idleSince: group.idleSince,
    members: [...group.members]
      .sort((a, b) => a.name.localeCompare(b.name, "de"))
      .map((member) => ({
        id: member.id,
        name: member.name,
        hasLogin: Boolean(member.userId),
        invited: Boolean(member.inviteEmail && !member.userId),
      })),
  };
}

export function jobDto(job: Job) {
  return {
    id: job.id,
    name: job.name,
    icon: job.icon,
    description: job.description,
    position: job.position,
  };
}

// ---------- slots (Ämtli ring with assigned groups) ----------

export async function loadSlots(db: Db, planId: string): Promise<Slot[]> {
  const jobs = await db.job.findMany({
    where: { planId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true, assignment: { select: { groupId: true } } },
  });
  return jobs.map((job) => ({ jobId: job.id, groupId: job.assignment?.groupId ?? null }));
}

/** Groups in rotation without an Ämtli, longest idle first (never-assigned groups first). */
export async function loadIdleGroupIds(db: Db, planId: string, slots: Slot[]): Promise<number[]> {
  const assigned = new Set(slots.map((slot) => slot.groupId).filter((id) => id !== null));
  const groups = await db.group.findMany({
    where: { planId, inRotation: true },
    select: { id: true, idleSince: true },
  });
  return groups
    .filter((group) => !assigned.has(group.id))
    .sort((a, b) => (a.idleSince?.getTime() ?? 0) - (b.idleSince?.getTime() ?? 0) || a.id - b.id)
    .map((group) => group.id);
}

/** Writes only the Ämtli whose group changed, then updates the groups' idle state. */
export async function writeSlots(db: Db, planId: string, before: Slot[], after: Slot[]) {
  const previous = new Map(before.map((slot) => [slot.jobId, slot.groupId]));
  for (const slot of after) {
    if (previous.get(slot.jobId) === slot.groupId) continue;
    if (slot.groupId === null) {
      await db.assignment.deleteMany({ where: { jobId: slot.jobId } });
    } else {
      await db.assignment.upsert({
        where: { jobId: slot.jobId },
        create: { planId, jobId: slot.jobId, groupId: slot.groupId },
        update: { groupId: slot.groupId },
      });
    }
  }
  await syncIdleSince(db, planId);
}

/** idleSince is set while a group is in rotation without Ämtli; cleared otherwise. */
export async function syncIdleSince(db: Db, planId: string, now = new Date()) {
  const groups = await db.group.findMany({
    where: { planId },
    select: { id: true, inRotation: true, idleSince: true, _count: { select: { assignments: true } } },
  });
  for (const group of groups) {
    const idle = group.inRotation && group._count.assignments === 0;
    if (idle && !group.idleSince) {
      await db.group.update({ where: { id: group.id }, data: { idleSince: now } });
    } else if (!idle && group.idleSince) {
      await db.group.update({ where: { id: group.id }, data: { idleSince: null } });
    }
  }
}

/** A group (re)joining the rotation takes the first free Ämtli. Returns false if none is free. */
export async function placeGroupInFreeSlot(db: Db, planId: string, groupId: number): Promise<boolean> {
  const slots = await loadSlots(db, planId);
  const filled = fillFirstFreeSlot(slots, groupId);
  if (!filled) return false;
  await writeSlots(db, planId, slots, filled);
  return true;
}
