import prisma from "~/server/utils/prisma";
import { syncRotationSchedule } from "~/server/services/rotationScheduler";

const ROTATION_SETTING_KEY = "rotationCron";

export default defineNitroPlugin(async () => {

  const record = await prisma.setting.findUnique({
    where: { key: ROTATION_SETTING_KEY },
  });
  const cronValue = record?.value ?? null;
  syncRotationSchedule(cronValue, '0 0 * * *');
});
