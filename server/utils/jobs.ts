import { apiError, isUniqueViolation } from "./errors";
import type { Db } from "./plan-data";

export function jobConflict(error: unknown): never {
  if (isUniqueViolation(error)) throw apiError(409, "JOB_NAME_TAKEN", "An Ämtli with this name already exists");
  throw error;
}

/** Re-numbers positions 0..n-1 in the current order (after deletes). */
export async function compactJobPositions(db: Db, planId: string) {
  const jobs = await db.job.findMany({
    where: { planId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true, position: true },
  });
  for (const [index, job] of jobs.entries()) {
    if (job.position !== index) await db.job.update({ where: { id: job.id }, data: { position: index } });
  }
}
