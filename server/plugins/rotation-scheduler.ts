import { useRuntimeConfig } from "#imports";
import prisma from "~/server/utils/prisma";
import { syncRotationSchedule } from "~/server/services/rotationScheduler";

const ROTATION_SETTING_KEY = "rotationCron";

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig();
  const fallback =
    typeof config.public?.rotationCron === "string" &&
    config.public.rotationCron.trim()
      ? config.public.rotationCron.trim()
      : undefined;

  const record = await prisma.setting.findUnique({
    where: { key: ROTATION_SETTING_KEY },
  });
  const cronValue = record?.value ?? null;
  syncRotationSchedule(cronValue, fallback);
});
