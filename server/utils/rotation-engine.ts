// Pure rotation rules, no database. Unit-tested in tests/unit/rotation-engine.spec.ts.

export type IdlePolicy = "slots" | "fair";

/** One Ämtli in ring order and the group doing it (null = nobody). */
export interface Slot {
  jobId: number;
  groupId: number | null;
}

export interface RotateInput {
  slots: Slot[];
  /** Groups in rotation that have no Ämtli, longest idle first. */
  idleGroupIds: number[];
  policy: IdlePolicy;
  steps: number;
}

export interface RotateResult {
  slots: Slot[];
  idleGroupIds: number[];
}

/**
 * Every group moves `steps` Ämtli forward; the last wraps to the first.
 * "slots": idle groups stay idle.
 * "fair": each idle group gets a bench slot behind the last Ämtli, so idle groups
 * rotate in and every group sits out equally often.
 */
export function rotate({ slots, idleGroupIds, policy, steps }: RotateInput): RotateResult {
  if (slots.length === 0) return { slots: [], idleGroupIds: [...idleGroupIds] };

  const bench = policy === "fair" ? idleGroupIds : [];
  const ring: Array<number | null> = [...slots.map((slot) => slot.groupId), ...bench];
  const size = ring.length;
  const shift = ((steps % size) + size) % size;
  const shifted = ring.map((_, index) => ring[(index - shift + size) % size] ?? null);

  return {
    slots: slots.map((slot, index) => ({ jobId: slot.jobId, groupId: shifted[index] ?? null })),
    idleGroupIds:
      policy === "fair"
        ? shifted.slice(slots.length).filter((id): id is number => id !== null)
        : [...idleGroupIds],
  };
}

/** Puts a group on the first Ämtli without a group. Returns null if all are taken. */
export function fillFirstFreeSlot(slots: Slot[], groupId: number): Slot[] | null {
  const index = slots.findIndex((slot) => slot.groupId === null);
  if (index === -1) return null;
  return slots.map((slot, i) => (i === index ? { ...slot, groupId } : slot));
}

export function sameSlots(a: Slot[], b: Slot[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((slot, i) => slot.jobId === b[i]?.jobId && slot.groupId === b[i]?.groupId);
}
