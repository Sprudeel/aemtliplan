import { describe, expect, test } from "vitest";
import { fillFirstFreeSlot, rotate, sameSlots, type Slot } from "~/server/utils/rotation-engine";

const slots = (...groups: Array<number | null>): Slot[] => groups.map((groupId, i) => ({ jobId: i + 1, groupId }));
const groupsOf = (result: Slot[]) => result.map((slot) => slot.groupId);

describe("rotate: slots policy", () => {
  test("every group moves one Ämtli forward, last wraps to first", () => {
    const { slots: next } = rotate({ slots: slots(1, 2, 3), idleGroupIds: [], policy: "slots", steps: 1 });
    expect(groupsOf(next)).toEqual([3, 1, 2]);
  });

  test("Ämtli ids stay in place", () => {
    const { slots: next } = rotate({ slots: slots(1, 2, 3), idleGroupIds: [], policy: "slots", steps: 1 });
    expect(next.map((s) => s.jobId)).toEqual([1, 2, 3]);
  });

  test("empty slots rotate like groups", () => {
    const { slots: next } = rotate({ slots: slots(1, null, 3), idleGroupIds: [], policy: "slots", steps: 1 });
    expect(groupsOf(next)).toEqual([3, 1, null]);
  });

  test("steps larger than the ring wrap around", () => {
    const { slots: next } = rotate({ slots: slots(1, 2, 3), idleGroupIds: [], policy: "slots", steps: 4 });
    expect(groupsOf(next)).toEqual([3, 1, 2]);
  });

  test("idle groups stay idle", () => {
    const result = rotate({ slots: slots(1, 2), idleGroupIds: [3], policy: "slots", steps: 1 });
    expect(groupsOf(result.slots)).toEqual([2, 1]);
    expect(result.idleGroupIds).toEqual([3]);
  });

  test("no Ämtli: nothing happens", () => {
    expect(rotate({ slots: [], idleGroupIds: [1], policy: "slots", steps: 1 }).slots).toEqual([]);
  });
});

describe("rotate: fair policy", () => {
  test("the longest idle group takes the first Ämtli, the last group sits out", () => {
    const result = rotate({ slots: slots(1, 2, 3), idleGroupIds: [4], policy: "fair", steps: 1 });
    expect(groupsOf(result.slots)).toEqual([4, 1, 2]);
    expect(result.idleGroupIds).toEqual([3]);
  });

  test("over a full cycle every group sits out exactly once", () => {
    let state = { slots: slots(1, 2, 3, 4, 5), idleGroupIds: [6] };
    const satOut = new Map<number, number>();
    for (let i = 0; i < 6; i++) {
      state = rotate({ ...state, policy: "fair", steps: 1 });
      for (const id of state.idleGroupIds) satOut.set(id, (satOut.get(id) ?? 0) + 1);
    }
    expect([...satOut.keys()].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...satOut.values()].every((count) => count === 1)).toBe(true);
    expect(groupsOf(state.slots)).toEqual([1, 2, 3, 4, 5]); // back to start
  });

  test("without idle groups fair equals slots", () => {
    const fair = rotate({ slots: slots(1, 2, 3), idleGroupIds: [], policy: "fair", steps: 1 });
    const plain = rotate({ slots: slots(1, 2, 3), idleGroupIds: [], policy: "slots", steps: 1 });
    expect(fair.slots).toEqual(plain.slots);
  });
});

describe("helpers", () => {
  test("fillFirstFreeSlot uses the first empty Ämtli", () => {
    expect(groupsOf(fillFirstFreeSlot(slots(1, null, null), 9)!)).toEqual([1, 9, null]);
  });

  test("fillFirstFreeSlot returns null when all are taken", () => {
    expect(fillFirstFreeSlot(slots(1, 2), 9)).toBeNull();
  });

  test("sameSlots compares jobs and groups", () => {
    expect(sameSlots(slots(1, 2), slots(1, 2))).toBe(true);
    expect(sameSlots(slots(1, 2), slots(2, 1))).toBe(false);
    expect(sameSlots(slots(1), slots(1, 2))).toBe(false);
  });
});
