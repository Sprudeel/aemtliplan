import prisma from "~/server/utils/prisma";
import { z } from "zod";

const Body = z.object({
  id: z.number().int(),
});

export default defineEventHandler(async (event) => {
  const { id } = Body.parse(await readBody(event));

  prisma.member.deleteMany({
    where: { groupId: id },
  });

  try {
    return await prisma.group.delete({
      where: {
        id: id,
      },
    });
  } catch {
    throw createError({ statusCode: 409, statusMessage: "Something went wrong..." });
  }
});
