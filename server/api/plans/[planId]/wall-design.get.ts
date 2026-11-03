import { defineEventHandler } from "h3";
import { withDefaults } from "../../../../shared/wall-design";
import { requirePlanRole } from "../../../utils/access";
import { ensurePlanSettings } from "../../../utils/plan-data";

// Wall designer document (defaults merged in).
export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "viewer");
  const settings = await ensurePlanSettings(planId);
  return withDefaults(settings.wallDesign);
});
