import { defineEventHandler } from "h3";
import { requireSession } from "../../../utils/access";
import { apiError } from "../../../utils/errors";
import { listMidataCamps } from "../../../utils/midata";
import { requireMidataToken } from "../../../utils/midata-access";

// Camps the signed-in MiData user can see.
export default defineEventHandler(async (event) => {
  await requireSession(event);
  const token = await requireMidataToken(event);
  try {
    return await listMidataCamps(token);
  } catch (error) {
    console.error("[midata] listing camps failed", error);
    throw apiError(502, "MIDATA_UNAVAILABLE", "MiData could not be reached");
  }
});
