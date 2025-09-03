import prisma from "~/server/utils/prisma";
import { z } from "zod";

const Body = z.object({
  id: z.number().int(),
});

export default defineEventHandler(async (event) => {
  const { id } = Body.parse(await readBody(event));

  try {
    return prisma.job.delete({
      where: {
        id: id,
      },
    });
  } catch {
    throw createError({ statusCode: 409, statusMessage: "Something went wrong..." });
  }
});
