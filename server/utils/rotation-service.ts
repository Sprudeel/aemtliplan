import type { Prisma, RotationLog, RotationTrigger } from "@prisma/client";
import { apiError, notFound } from "./errors";
import {
  ensurePlanSettings,
  loadIdleGroupIds,
  loadSlots,
  lockPlan,
  markAssignmentsChanged,
  writeSlots,
} from "./plan-data";
import prisma from "./prisma";
import { rotate, sameSlots, type Slot } from "./rotation-engine";
import { nextRunAt } from "./schedule";

const asJson = (slots: Slot[]) => slots as unknown as Prisma.InputJsonValue;
const fromJson = (value: Prisma.JsonValue) => value as unknown as Slot[];

export function rotationDto(log: RotationLog) {
  return {
    id: log.id,
    at: log.at,
    trigger: log.trigger,
    byUserId: log.byUserId,
    before: fromJson(log.before),
    after: fromJson(log.after),
    undoneAt: log.undoneAt,
  };
}

/** What the next rotation would do, without saving. */
export async function previewRotation(planId: string, steps: number) {
  const settings = await ensurePlanSettings(planId);
  const before = await loadSlots(prisma, planId);
  if (before.length === 0) return [];
  const idle = await loadIdleGroupIds(prisma, planId, before);
  const { slots: after } = rotate({ slots: before, idleGroupIds: idle, policy: settings.idlePolicy, steps });
  return before.map((slot, i) => ({
    jobId: slot.jobId,
    currentGroupId: slot.groupId,
    nextGroupId: after[i]?.groupId ?? null,
  }));
}

export async function rotatePlan(
  planId: string,
  options: { steps?: number; trigger: Exclude<RotationTrigger, "undo">; byUserId?: string | null },
) {
  const settings = await ensurePlanSettings(planId);
  const log = await prisma.$transaction(async (tx) => {
    await lockPlan(tx, planId);
    const before = await loadSlots(tx, planId);
    if (before.length === 0) throw apiError(400, "NO_JOBS", "Plan has no Ämtli");
    const idle = await loadIdleGroupIds(tx, planId, before);
    const { slots: after } = rotate({
      slots: before,
      idleGroupIds: idle,
      policy: settings.idlePolicy,
      steps: options.steps ?? 1,
    });
    await writeSlots(tx, planId, before, after);
    return tx.rotationLog.create({
      data: {
        planId,
        trigger: options.trigger,
        byUserId: options.byUserId ?? null,
        before: asJson(before),
        after: asJson(after),
      },
    });
  });
  await markAssignmentsChanged(planId, "rotation");
  return log;
}

/**
 * Undo is allowed only for the latest rotation, and only if nobody changed the
 * assignments since (otherwise those changes would be silently lost).
 */
export async function undoRotation(planId: string, rotationId: number, byUserId: string) {
  await ensurePlanSettings(planId);
  const log = await prisma.$transaction(async (tx) => {
    await lockPlan(tx, planId);
    const target = await tx.rotationLog.findFirst({ where: { id: rotationId, planId } });
    if (!target) throw notFound("Rotation");
    const latest = await tx.rotationLog.findFirst({ where: { planId }, orderBy: { id: "desc" } });
    if (latest?.id !== target.id) {
      throw apiError(409, "ROTATION_NOT_LATEST", "Only the latest rotation can be undone");
    }
    if (target.trigger === "undo" || target.undoneAt) {
      throw apiError(409, "CANNOT_UNDO_UNDO", "An undo cannot be undone");
    }

    const current = await loadSlots(tx, planId);
    if (!sameSlots(current, fromJson(target.after))) {
      throw apiError(409, "ROTATION_STATE_CHANGED", "Assignments changed since this rotation");
    }

    // Groups that were deleted or left the rotation since then cannot come back.
    const activeGroups = new Set(
      (await tx.group.findMany({ where: { planId, inRotation: true }, select: { id: true } })).map((g) => g.id),
    );
    const restored = fromJson(target.before).map((slot) => ({
      jobId: slot.jobId,
      groupId: slot.groupId !== null && activeGroups.has(slot.groupId) ? slot.groupId : null,
    }));

    await writeSlots(tx, planId, current, restored);
    await tx.rotationLog.update({ where: { id: target.id }, data: { undoneAt: new Date() } });
    return tx.rotationLog.create({
      data: { planId, trigger: "undo", byUserId, before: asJson(current), after: asJson(restored) },
    });
  });
  await markAssignmentsChanged(planId, "undo");
  return log;
}

/**
 * Called every minute by the scheduler plugin. Each due plan rotates once, even if
 * several runs were missed (server was down). Claiming via nextRotationAt makes it
 * safe if two server instances tick at the same time.
 */
export async function runDueRotations(now = new Date()): Promise<number> {
  const due = await prisma.planSettings.findMany({
    where: { rotationEnabled: true, nextRotationAt: { lte: now } },
  });
  let rotated = 0;
  for (const settings of due) {
    const claim = await prisma.planSettings.updateMany({
      where: { planId: settings.planId, nextRotationAt: settings.nextRotationAt },
      data: { nextRotationAt: nextRunAt(settings.rotationTime, settings.timezone, now) },
    });
    if (claim.count !== 1) continue;
    try {
      await rotatePlan(settings.planId, { trigger: "schedule" });
      rotated++;
    } catch (error) {
      const code = (error as { data?: { code?: string } }).data?.code;
      if (code !== "NO_JOBS") console.error(`[scheduler] rotation of plan ${settings.planId} failed`, error);
    }
  }
  return rotated;
}
