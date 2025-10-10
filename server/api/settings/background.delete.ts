import { promises as fsp } from "node:fs";
import { join } from "node:path";
import { requireAdmin } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

const BACKGROUND_KEY = "backgroundImage";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const existing = await prisma.setting.findUnique({
    where: { key: BACKGROUND_KEY },
  });
  if (!existing) {
    return { ok: true };
  }

  const relativePath = existing.value;
  if (relativePath) {
    const absolute = join(
      process.cwd(),
      "public",
      relativePath.replace(/^\//, ""),
    );
    try {
      await fsp.unlink(absolute);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn("Failed to remove background image", error);
      }
    }
  }

  await prisma.setting.delete({ where: { key: BACKGROUND_KEY } });

  return { ok: true };
});
