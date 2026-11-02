import { defineEventHandler } from "h3";
import { requirePlanRole } from "../../../utils/access";
import { ensurePlanSettings, settingsDto } from "../../../utils/plan-data";

export default defineEventHandler(async (event) => {
  const { plan, role, planId } = await requirePlanRole(event, "viewer");
  const settings = await ensurePlanSettings(planId);
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    myRole: role,
    nextRotationAt: settings.rotationEnabled ? settings.nextRotationAt : null,
    settings: settingsDto(settings),
  };
});
