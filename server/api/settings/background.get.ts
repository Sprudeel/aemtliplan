import prisma from "~/server/utils/prisma";

const BACKGROUND_KEY = "backgroundImage";

export default defineEventHandler(async () => {
  const record = await prisma.setting.findUnique({
    where: { key: BACKGROUND_KEY },
  });
  return {
    path: record?.value ?? null,
  };
});
