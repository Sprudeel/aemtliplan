import { z } from "zod";
import { requireUser } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

const Body = z.object({ jobId: z.number().int(), groupId: z.number().int() });

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { jobId, groupId } = Body.parse(await readBody(event));
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, inRotation: true },
  });
  if (!group) {
    throw createError({
      statusCode: 404,
      statusMessage: "Gruppe wurde nicht gefunden.",
    });
  }
  if (!group.inRotation) {
    throw createError({
      statusCode: 400,
      statusMessage: "Diese Gruppe ist nicht im Rotationszyklus.",
    });
  }

  // upsert by jobId
  return prisma.groupJob.upsert({
    where: { jobId },
    create: { jobId, groupId },
    update: { groupId },
    include: { job: true, group: true },
  });
});
