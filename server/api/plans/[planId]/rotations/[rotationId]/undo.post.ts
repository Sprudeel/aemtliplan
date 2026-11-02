import { defineEventHandler, setResponseStatus } from "h3";
import { requirePlanRole } from "../../../../../utils/access";
import { idParam } from "../../../../../utils/errors";
import { rotationDto, undoRotation } from "../../../../../utils/rotation-service";

// Undo the latest rotation (only that one, and only if nothing changed since).
export default defineEventHandler(async (event) => {
  const { planId, user } = await requirePlanRole(event, "admin");
  const rotationId = idParam(event, "rotationId", "Rotation");
  const log = await undoRotation(planId, rotationId, user.id);
  setResponseStatus(event, 201);
  return rotationDto(log);
});
