import prisma from "~/server/utils/prisma";
import { requireAdmin } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
});
