import { getSession } from "~/server/utils/auth";
import { requireUser } from "~/server/utils/auth";
export default defineEventHandler(async (event) => {
  await requireUser(event);
    const s = await getSession(event);
  return s
    ? {
        id: s.user.id,
        email: s.user.email,
        name: s.user.name,
        role: s.user.role,
      }
    : null;
});
