import { randomUUID } from "node:crypto";
import { defineEventHandler, getRequestHeader, readMultipartFormData } from "h3";
import { requirePlanRole } from "../../../utils/access";
import { apiError } from "../../../utils/errors";
import { detectImageType, MAX_UPLOAD_BYTES } from "../../../utils/images";
import { emitPlanChanged } from "../../../utils/plan-events";
import { ensurePlanSettings, fileUrl } from "../../../utils/plan-data";
import prisma from "../../../utils/prisma";

const tooLarge = () => apiError(413, "FILE_TOO_LARGE", "Image must be 10 MB or smaller");

export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");

  // Reject early when the client announces a too large body; checked again below.
  const declared = Number(getRequestHeader(event, "content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) throw tooLarge();

  const parts = await readMultipartFormData(event);
  const file = parts?.find((part) => part.name === "file" && part.data?.length);
  if (!file) throw apiError(400, "FILE_MISSING", "Send the image as form field 'file'");
  if (file.data.length > MAX_UPLOAD_BYTES) throw tooLarge();

  const type = detectImageType(file.data);
  if (!type) throw apiError(415, "UNSUPPORTED_IMAGE", "Only PNG, JPEG or WebP images");

  const storage = useStorage("uploads");
  const key = `backgrounds/${planId}/${randomUUID()}.${type.ext}`;
  await storage.setItemRaw(key, file.data);

  const settings = await ensurePlanSettings(planId);
  if (settings.backgroundKey) await storage.removeItem(settings.backgroundKey);
  await prisma.planSettings.update({ where: { planId }, data: { backgroundKey: key } });

  emitPlanChanged(planId, "settings");
  return { url: fileUrl(key) };
});
