import { Cron } from "croner";

/** Next time after `from` when it is `rotationTime` (HH:mm) in `timezone`. DST-safe via croner. */
export function nextRunAt(rotationTime: string, timezone: string, from: Date = new Date()): Date {
  const [hours, minutes] = rotationTime.split(":").map(Number);
  const cron = new Cron(`${minutes} ${hours} * * *`, { timezone, paused: true });
  const next = cron.nextRun(from);
  cron.stop();
  if (!next) throw new Error(`No next run for ${rotationTime} ${timezone}`);
  return next;
}
