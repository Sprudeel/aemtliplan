import { ensureJob } from "~/server/utils/scheduler";
import {
  performRotation,
  DEFAULT_ROTATION_CRON,
} from "~/server/utils/rotation";

const ROTATION_JOB_ID = "rotation:automatic";

const rotationHandler = async () => {
  try {
    await performRotation();
  } catch (error) {
    console.error("Automatic rotation failed", error);
  }
};

export function syncRotationSchedule(
  cron: string | null | undefined,
  fallback?: string,
) {
  const trimmed = cron?.trim() ?? "";
  const effectiveFallback = fallback?.trim() || DEFAULT_ROTATION_CRON;
  const expression = trimmed || effectiveFallback;
  const enabled = Boolean(trimmed);
  ensureJob(ROTATION_JOB_ID, expression, rotationHandler, enabled);
}
