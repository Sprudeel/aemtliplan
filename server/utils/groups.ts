import { Prisma } from "@prisma/client";
import { apiError } from "./errors";
import type { Db } from "./plan-data";

/** Trims and removes duplicates (case-insensitive), keeping the first spelling. */
export function cleanMemberNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const key = name.toLocaleLowerCase("de");
    if (!name || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/** A person may only be in one group per plan. */
export async function assertMembersFree(db: Db, planId: string, names: string[], exceptGroupId: number | null) {
  const taken = await db.member.findMany({
    where: {
      planId,
      OR: names.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })),
      ...(exceptGroupId !== null && { groupId: { not: exceptGroupId } }),
    },
    select: { name: true },
  });
  if (taken.length) {
    const list = taken.map((member) => member.name);
    throw apiError(409, "MEMBER_IN_OTHER_GROUP", `Already in another group: ${list.join(", ")}`, { names: list });
  }
}

/** Maps a unique-constraint error on Group/Member to a readable 409. */
export function groupConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const model = (error.meta as { modelName?: string } | undefined)?.modelName;
    if (model === "Member") throw apiError(409, "MEMBER_IN_OTHER_GROUP", "A member is already in another group");
    throw apiError(409, "GROUP_NAME_TAKEN", "A group with this name already exists");
  }
  throw error;
}
