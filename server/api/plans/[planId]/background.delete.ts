import { defineEventHandler, setResponseStatus } from "h3";
import { requirePlanRole } from "../../../utils/access";
import { emitPlanChanged } from "../../../utils/plan-events";
import { ensurePlanSettings } from "../../../utils/plan-data";
import prisma from "../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");
  const settings = await ensurePlanSettings(planId);
  if (settings.backgroundKey) {
    await useStorage("uploads").removeItem(settings.backgroundKey);
    await prisma.planSettings.update({ where: { planId }, data: { backgroundKey: null } });
    emitPlanChanged(planId, "settings");
  }
  setResponseStatus(event, 204);
  return null;
});
