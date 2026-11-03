import type { Prisma } from "@prisma/client";
import { defineEventHandler } from "h3";
import { WallDesign } from "../../../../shared/wall-design";
import { requirePlanRole } from "../../../utils/access";
import { parseBody } from "../../../utils/errors";
import { emitPlanChanged } from "../../../utils/plan-events";
import { ensurePlanSettings } from "../../../utils/plan-data";
import prisma from "../../../utils/prisma";

// Saves the whole design document; the public wall reloads it via SSE.
export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "admin");
  const design = await parseBody(event, WallDesign);
  await ensurePlanSettings(planId);
  await prisma.planSettings.update({
    where: { planId },
    data: { wallDesign: design as unknown as Prisma.InputJsonValue },
  });
  emitPlanChanged(planId, "settings");
  return design;
});
