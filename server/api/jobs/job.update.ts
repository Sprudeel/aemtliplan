import { z } from "zod";
import { requireUser } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

const Body = z.object({
  id: z.int(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
});

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { id, name, description, icon } = Body.parse(await readBody(event));

  try {
    return prisma.job.update({
      where: {
        id: id,
      },
      data: {
        name: name,
        description: description,
        icon: icon,
      },
    });
  } catch {
    throw createError({
      statusCode: 409,
      statusMessage: "Something went wrong...",
    });
  }
});
