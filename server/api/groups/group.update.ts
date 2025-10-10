import { z } from "zod";
import { requireUser } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

const Body = z.object({
  id: z.int(),
  name: z.string(),
  members: z.array(z.string()).min(1).max(100),
  color: z.string(),
  inRotation: z.boolean().optional().default(true),
});

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { id, name, color, members, inRotation } = Body.parse(
    await readBody(event),
  );
  const uniqMembers = Array.from(new Set(members.filter(Boolean)));

  const existing = await prisma.group.findUnique({
    where: { id },
    select: { inRotation: true },
  });
  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: "Gruppe wurde nicht gefunden.",
    });
  }

  try {
    const operations: any[] = [
      prisma.group.update({
        where: { id },
        data: {
          name,
          color,
          inRotation,
          members: {
            deleteMany: {},
            create: uniqMembers.map((m) => ({ name: m })),
          },
        },
        include: { members: true },
      }),
    ];

    if (existing.inRotation && !inRotation) {
      operations.push(prisma.groupJob.deleteMany({ where: { groupId: id } }));
    }

    const [updated] = await prisma.$transaction(operations);
    return updated;
  } catch {
    throw createError({
      statusCode: 409,
      statusMessage: "Something went wrong...",
    });
  }
});
