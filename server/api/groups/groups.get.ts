import prisma from "~/server/utils/prisma";

export default defineEventHandler(async () => {
  return prisma.group.findMany({
    orderBy: { name: "asc" },
    include: { members: true },
  });
});
