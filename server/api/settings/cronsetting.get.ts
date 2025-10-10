import prisma from "~/server/utils/prisma";
import { useRuntimeConfig } from "#imports";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const fallbackCron =
    typeof config.public?.rotationCron === "string"
      ? config.public.rotationCron
      : "";

  const setting = await prisma.setting.findUnique({
    where: { key: "rotationCron" },
  });

  return {
    cron: setting?.value ?? fallbackCron,
  };
});
