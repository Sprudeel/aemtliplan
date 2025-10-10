import prisma from "~/server/utils/prisma";
import { requireAdmin } from "~/server/utils/auth";
import { z } from "zod";

const Body = z.object({
  id: z.number().int().positive(),
});

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const { id } = Body.parse(await readBody(event));

  if (id === admin.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Du kannst dich nicht selbst löschen.",
    });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: "Nutzer wurde nicht gefunden.",
    });
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return { ok: true };
});
