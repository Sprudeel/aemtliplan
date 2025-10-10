import { z } from "zod";
import { requireUser } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

const Body = z.object({
  order: z.array(z.number().int()).nonempty(),
});

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { order } = Body.parse(await readBody(event));

  const jobs = await prisma.job.findMany({
    where: { id: { in: order } },
    select: { id: true },
  });

  const existingIds = new Set(jobs.map((j) => j.id));
  if (order.some((id) => !existingIds.has(id))) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unknown jobId in order",
    });
  }

  const updates = order.map((jobId, index) =>
    prisma.job.update({
      where: { id: jobId },
      data: { rotationPointer: index },
    }),
  );

  await prisma.$transaction(updates);

  return { ok: true, count: order.length };
});
