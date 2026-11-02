import { defineEventHandler } from "h3";
import { RotationListQuery } from "../../../../../shared/schemas";
import { requirePlanRole } from "../../../../utils/access";
import { parseQuery } from "../../../../utils/errors";
import prisma from "../../../../utils/prisma";
import { rotationDto } from "../../../../utils/rotation-service";

// Rotation history, newest first.
export default defineEventHandler(async (event) => {
  const { planId } = await requirePlanRole(event, "viewer");
  const { limit } = parseQuery(event, RotationListQuery);
  const logs = await prisma.rotationLog.findMany({
    where: { planId },
    orderBy: { id: "desc" },
    take: limit,
  });
  return logs.map(rotationDto);
});
