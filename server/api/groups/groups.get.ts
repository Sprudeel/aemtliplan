import { requireUser } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  try {
    return prisma.group.findMany({
      orderBy: { name: "asc" },
      include: { members: true },
    });
  } catch {
    throw createError({
      statusCode: 409,
      statusMessage: "Something went wrong...",
    });
  }
});
