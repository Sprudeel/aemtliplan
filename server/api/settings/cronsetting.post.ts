import { z } from "zod";
import { Cron } from "croner";
import prisma from "~/server/utils/prisma";
import { requireUser } from "~/server/utils/auth";
import { syncRotationSchedule } from "~/server/services/rotationScheduler";
import { DEFAULT_ROTATION_CRON } from '~/server/utils/rotation'

const Body = z.object({
  cron: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { cron: rawCron } = Body.parse(await readBody(event));
  const cron = (rawCron ?? "").trim();

  if (!cron) {
    await prisma.setting.deleteMany({ where: { key: "rotationCron" } });
    syncRotationSchedule(null, DEFAULT_ROTATION_CRON);
    return { cron: "" };
  }

  try {
    const cronInstance = new Cron(cron, { maxRuns: 1, paused: true });
    cronInstance.nextRun();
    cronInstance.stop();
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ungültiger Cron-Ausdruck.",
    });
  }

  const saved = await prisma.setting.upsert({
    where: { key: "rotationCron" },
    update: { value: cron },
    create: { key: "rotationCron", value: cron },
  });

  syncRotationSchedule(cron, DEFAULT_ROTATION_CRON);

  return { cron: saved.value };
});
