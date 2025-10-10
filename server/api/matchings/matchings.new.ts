import { requireUser } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const [groups, jobs, assigned] = await Promise.all([
    prisma.group.findMany({ orderBy: { name: "asc" } }),
    prisma.job.findMany({ orderBy: { name: "asc" } }),
    prisma.groupJob.findMany({ select: { jobId: true } }),
  ]);
  const taken = new Set(assigned.map((a) => a.jobId));
  return { groups, availableJobs: jobs.filter((j) => !taken.has(j.id)) };
});
