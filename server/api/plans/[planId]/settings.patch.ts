import { defineEventHandler } from "h3";
import { SettingsPatch } from "../../../../shared/schemas";
import { requirePlanRole } from "../../../utils/access";
import { parseBody } from "../../../utils/errors";
import { emitPlanChanged } from "../../../utils/plan-events";
import { ensurePlanSettings, settingsDto } from "../../../utils/plan-data";
import prisma from "../../../utils/prisma";
import { nextRunAt } from "../../../utils/schedule";

export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");
  const patch = await parseBody(event, SettingsPatch);
  const current = await ensurePlanSettings(planId);

  const merged = { ...current, ...patch };
  const scheduleChanged =
    patch.rotationEnabled !== undefined ||
    patch.rotationTime !== undefined ||
    patch.timezone !== undefined;

  const updated = await prisma.planSettings.update({
    where: { planId },
    data: {
      ...patch,
      // The server computes the next run, so the UI can't show a schedule that isn't active.
      ...(scheduleChanged && {
        nextRotationAt: merged.rotationEnabled
          ? nextRunAt(merged.rotationTime, merged.timezone)
          : null,
      }),
    },
  });

  emitPlanChanged(planId, "settings");
  return {
    nextRotationAt: updated.rotationEnabled ? updated.nextRotationAt : null,
    ...settingsDto(updated),
  };
});
