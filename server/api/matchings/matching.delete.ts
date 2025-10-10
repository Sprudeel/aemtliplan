import { z } from "zod";
import { requireUser } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

const Body = z.object({ jobId: z.number().int() });

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { jobId } = Body.parse(await readBody(event));
  return prisma.groupJob.delete({ where: { jobId } });
});
