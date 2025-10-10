import { CronJob, CronTime } from "cron";

type Handler = () => Promise<void> | void;

const jobs = new Map<string, CronJob>();
const handlers = new Map<string, Handler>();

export function ensureJob(
  id: string,
  cronExpr: string,
  handler: Handler,
  enabled: boolean,
  timeZone = "Europe/Zurich",
) {
  handlers.set(id, handler);
  let job = jobs.get(id);

  if (!job) {
    job = new CronJob(
      cronExpr,
      () => handlers.get(id)?.(),
      null,
      false,
      timeZone,
    );
    jobs.set(id, job);
  } else {
    job.setTime(new CronTime(cronExpr));
  }

  if (enabled && !job.isActive) {
    job.start();
  }

  if (!enabled && job.isActive) {
    job.stop();
  }
}

export function updateSchedule(id: string, cronExpr: string) {
  const job = jobs.get(id);
  if (!job) throw new Error(`Job ${id} not found`);
  job.setTime(new CronTime(cronExpr));
}

export function enableJob(id: string) {
  const job = jobs.get(id);
  if (!job) throw new Error(`Job ${id} not found`);
  if (!job.isActive) job.start();
}

export function disableJob(id: string) {
  const job = jobs.get(id);
  if (!job) throw new Error(`Job ${id} not found`);
  if (job.isActive) job.stop();
}
