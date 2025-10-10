import { getQuery } from "h3";
import { z } from "zod";
import { requireUser } from "~/server/utils/auth";
import { getRotationPreview } from "~/server/utils/rotation";

const Query = z.object({
  step: z.coerce.number().int().optional(),
  jobIds: z
    .array(z.coerce.number().int())
    .optional()
    .transform((arr) =>
      arr && arr.length ? Array.from(new Set(arr)) : undefined,
    ),
});

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { step, jobIds } = Query.parse(getQuery(event));
  return getRotationPreview(step ?? 1, jobIds);
});
