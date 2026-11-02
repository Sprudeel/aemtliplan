import { defineEventHandler, setResponseStatus } from "h3";
import { RotationCreate } from "../../../../../shared/schemas";
import { requirePlanRole } from "../../../../utils/access";
import { parseBody } from "../../../../utils/errors";
import { rotatePlan, rotationDto } from "../../../../utils/rotation-service";

// Manual rotation ("Rotation jetzt auslösen").
export default defineEventHandler(async (event) => {
  const { planId, user } = await requirePlanRole(event, "admin");
  const { steps } = await parseBody(event, RotationCreate);
  const log = await rotatePlan(planId, { steps, trigger: "manual", byUserId: user.id });
  setResponseStatus(event, 201);
  return rotationDto(log);
});
