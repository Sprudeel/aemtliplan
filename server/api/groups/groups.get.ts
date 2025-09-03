import prisma from "~/server/utils/prisma";

export default defineEventHandler(async () => {
  try {
    return prisma.group.findMany({
      orderBy: { name: "asc" },
      include: { members: true },
    });
  } catch  {
    throw createError({ statusCode: 409, statusMessage: "Something went wrong..." });
  }
});
