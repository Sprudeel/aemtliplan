import { z } from "zod";
import { requireUser } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

const Body = z.object({
  id: z.number().int(),
});

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { id } = Body.parse(await readBody(event));

  try {
    prisma.member.deleteMany({
      where: { groupId: id },
    });

    return await prisma.group.delete({
      where: {
        id: id,
      },
    });
  } catch {
    throw createError({
      statusCode: 409,
      statusMessage: "Something went wrong...",
    });
  }
});
