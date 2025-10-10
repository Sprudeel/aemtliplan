import { z } from "zod";
import { requireUser } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

const Body = z.object({
  name: z.string(),
  description: z.string(),
  icon: z.string(),
});

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { name, description, icon } = Body.parse(await readBody(event));

  try {
    return await prisma.job.create({
      data: {
        name,
        description,
        icon,
      },
    });
  } catch {
    throw createError({
      statusCode: 409,
      statusMessage: "Something went wrong...",
    });
  }
});
