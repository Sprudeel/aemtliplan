import { readMultipartFormData } from "h3";
import { promises as fsp } from "node:fs";
import { join } from "node:path";
import { requireAdmin } from "~/server/utils/auth";
import prisma from "~/server/utils/prisma";

const BACKGROUND_KEY = "backgroundImage";
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const form = await readMultipartFormData(event);
  if (!form || !form.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Keine Datei gefunden.",
    });
  }

  const file = form.find((part) => part.type && part.filename);
  if (!file) {
    throw createError({
      statusCode: 400,
      statusMessage: "Keine Bilddatei übermittelt.",
    });
  }

  if (file.type && !ALLOWED_MIME.includes(file.type)) {
    throw createError({
      statusCode: 415,
      statusMessage: "Nur PNG, JPEG oder WebP erlaubt.",
    });
  }

  await fsp.mkdir(UPLOAD_DIR, { recursive: true });

  const extension = file.filename?.split(".").pop()?.toLowerCase() || "png";
  const fileName = `background-${Date.now()}.${extension}`;
  const relativePath = `/uploads/${fileName}`;
  const destination = join(UPLOAD_DIR, fileName);

  await fsp.writeFile(destination, file.data);

  const previous = await prisma.setting.findUnique({
    where: { key: BACKGROUND_KEY },
  });
  if (previous?.value) {
    const previousPath = join(
      process.cwd(),
      "public",
      previous.value.replace(/^\//, ""),
    );
    try {
      await fsp.unlink(previousPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn("Could not remove previous background image", error);
      }
    }
  }

  await prisma.setting.upsert({
    where: { key: BACKGROUND_KEY },
    update: { value: relativePath },
    create: { key: BACKGROUND_KEY, value: relativePath },
  });

  return { ok: true, path: relativePath };
});

export const config = {
  api: {
    bodyParser: false,
  },
};
