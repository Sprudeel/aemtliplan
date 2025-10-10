import type { Prisma } from "@prisma/client";
import type {
  RotationPreviewGroup,
  RotationPreviewJob,
  RotationPreviewResponse,
} from "~/types/dashboard";
import prisma from "~/server/utils/prisma";

interface RotationComputation extends RotationPreviewResponse {
  jobIdsInOrder: number[];
  currentGroupIds: Array<number | null>;
  nextGroupIds: Array<number | null>;
}

function mapGroup(assignment: {
  group: {
    id: number;
    name: string;
    color: string;
    inRotation: boolean;
    members: Array<{ name: string | null }>;
  } | null;
}): RotationPreviewGroup | null {
  const group = assignment.group;
  if (!group || group.inRotation === false) return null;
  return {
    id: group.id,
    name: group.name,
    color: group.color,
    members: group.members
      .map((member) => member?.name ?? "")
      .filter((name): name is string => Boolean(name)),
  };
}

export async function computeRotation(
  step = 1,
  jobIds?: number[] | null,
): Promise<RotationComputation> {
  const jobs = await prisma.job.findMany({
    orderBy: { rotationPointer: "asc" },
    where: jobIds && jobIds.length ? { id: { in: jobIds } } : undefined,
    select: {
      id: true,
      name: true,
      icon: true,
      description: true,
      rotationPointer: true,
    },
  });

  const totalJobs = jobs.length;
  if (!totalJobs) {
    throw createError({ statusCode: 400, statusMessage: "No jobs in ring" });
  }

  const normalizedStep = ((step % totalJobs) + totalJobs) % totalJobs;

  const jobIdsInOrder = jobs.map((job) => job.id);

  const assignments = await prisma.groupJob.findMany({
    where: { jobId: { in: jobIdsInOrder } },
    include: {
      group: {
        include: {
          members: true,
        },
      },
    },
  });

  const assignmentMap = new Map<number, RotationPreviewGroup | null>();
  jobIdsInOrder.forEach((jobId) => assignmentMap.set(jobId, null));
  assignments.forEach((assignment) => {
    assignmentMap.set(assignment.jobId, mapGroup(assignment));
  });

  const orderedGroups = jobIdsInOrder.map((jobId) => assignmentMap.get(jobId));
  const shiftedGroups = orderedGroups.map((_, index) => {
    if (normalizedStep === 0) return orderedGroups[index];
    const sourceIndex = (index - normalizedStep + totalJobs) % totalJobs;
    return orderedGroups[sourceIndex] ?? null;
  });

  const jobsWithPreview: RotationPreviewJob[] = jobs.map((job, index) => ({
    job,
    currentGroup: orderedGroups[index] ?? null,
    nextGroup: shiftedGroups[index] ?? null,
  }));

  return {
    step: normalizedStep,
    totalJobs,
    jobs: jobsWithPreview,
    jobIdsInOrder,
    currentGroupIds: orderedGroups.map((group) => group?.id ?? null),
    nextGroupIds: shiftedGroups.map((group) => group?.id ?? null),
  };
}

export async function getRotationPreview(
  step = 1,
  jobIds?: number[] | null,
): Promise<RotationPreviewResponse> {
  const data = await computeRotation(step, jobIds);
  return { step: data.step, totalJobs: data.totalJobs, jobs: data.jobs };
}

export async function performRotation(step = 1, jobIds?: number[] | null) {
  const data = await computeRotation(step, jobIds);

  if (data.step === 0) {
    return { updated: 0, step: data.step };
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [];

  data.jobIdsInOrder.forEach((jobId, index) => {
    const nextGroupId = data.nextGroupIds[index];
    const currentGroupId = data.currentGroupIds[index];

    if (nextGroupId === currentGroupId) return;

    if (nextGroupId == null) {
      if (currentGroupId != null) {
        ops.push(prisma.groupJob.delete({ where: { jobId } }));
      }
      return;
    }

    ops.push(
      prisma.groupJob.upsert({
        where: { jobId },
        create: { jobId, groupId: nextGroupId },
        update: { groupId: nextGroupId },
      }),
    );
  });

  if (!ops.length) {
    return { updated: 0, step: data.step };
  }

  await prisma.$transaction(ops);

  return { updated: ops.length, step: data.step };
}
export const DEFAULT_ROTATION_CRON = "0 17 * * *";
