import prisma from "~/server/utils/prisma";

export default defineEventHandler(async () => {

  const setting = await prisma.setting.findUnique({
    where: { key: "rotationCron" },
  });

  return {
    cron: setting?.value ?? '0 17 * * *',
  };
});
