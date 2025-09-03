import prisma from "~/server/utils/prisma";

export default defineEventHandler(async () => {
  return prisma.job.findMany({
    orderBy: { name: "asc" },
  });
});
