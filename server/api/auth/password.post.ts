import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireUser } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

const Body = z.object({
  currentPassword: z.string().min(8, "Aktuelles Passwort zu kurz."),
  newPassword: z
    .string()
    .min(8, "Neues Passwort muss mindestens 8 Zeichen haben."),
});

export default defineEventHandler(async (event) => {
  const sessionUser = await requireUser(event);
  const { currentPassword, newPassword } = Body.parse(await readBody(event));

  if (currentPassword === newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: "Das neue Passwort muss sich vom alten unterscheiden.",
    });
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "Benutzer wurde nicht gefunden.",
    });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    throw createError({
      statusCode: 400,
      statusMessage: "Aktuelles Passwort ist ungültig.",
    });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return { ok: true };
});
