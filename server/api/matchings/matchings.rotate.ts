import { z } from "zod";
import { requireUser } from "~/server/utils/auth";
import { performRotation } from "~/server/utils/rotation";

const Body = z.object({
  jobIds: z.array(z.number().int()).optional(),
  step: z.number().int().min(1).default(1),
});

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { jobIds, step } = Body.parse(await readBody(event));
  return performRotation(step, jobIds ?? undefined);
});
