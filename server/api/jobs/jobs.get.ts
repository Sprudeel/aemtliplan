import { requireUser } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  try {
    return prisma.job.findMany({
      orderBy: { name: "asc" },
    });
  } catch {
    throw createError({
      statusCode: 409,
      statusMessage: "Something went wrong...",
    });
  }
});
