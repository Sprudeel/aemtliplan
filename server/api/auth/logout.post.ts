import prisma from "~/server/utils/prisma";
import { getCookie, deleteCookie } from "h3";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "sid");
  if (token)
    await prisma.session.delete({ where: { id: token } }).catch(() => {});
  deleteCookie(event, "sid", { path: "/" });
  return { ok: true };
});
