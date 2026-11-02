import { beforeAll, describe, expect, test } from "vitest";
import { createPlan, ring, seedPlan, signUp, type TestUser } from "../helpers/api";

let admin: TestUser;
beforeAll(async () => {
  admin = await signUp("Admin");
});

describe("assignments", () => {
  test("assign and clear", async () => {
    const { planId, jobIds, groupIds } = await seedPlan(admin, { groups: 2, jobs: 2, assign: false });
    const put = await admin.client.put(`/api/plans/${planId}/assignments/${jobIds[0]}`, { groupId: groupIds[1] });
    expect(put.body.group.id).toBe(groupIds[1]);
    expect(await ring(admin.client, planId)).toEqual([groupIds[1], null]);

    expect((await admin.client.delete(`/api/plans/${planId}/assignments/${jobIds[0]}`)).status).toBe(204);
    expect((await admin.client.delete(`/api/plans/${planId}/assignments/${jobIds[0]}`)).status).toBe(404);
  });

  test("group out of rotation cannot be assigned", async () => {
    const { planId, jobIds, groupIds } = await seedPlan(admin, { groups: 1, jobs: 1, assign: false });
    await admin.client.patch(`/api/plans/${planId}/groups/${groupIds[0]}`, { inRotation: false });
    const res = await admin.client.put(`/api/plans/${planId}/assignments/${jobIds[0]}`, { groupId: groupIds[0] });
    expect(res.status).toBe(400);
    expect(res.body.data.code).toBe("GROUP_NOT_IN_ROTATION");
  });

  test("leaving the rotation frees the Ämtli; coming back takes the first free one", async () => {
    const { planId, groupIds } = await seedPlan(admin, { groups: 3, jobs: 3 });
    const [g1, g2, g3] = groupIds;
    await admin.client.patch(`/api/plans/${planId}/groups/${g2}`, { inRotation: false });
    expect(await ring(admin.client, planId)).toEqual([g1, null, g3]);

    await admin.client.post(`/api/plans/${planId}/rotations`);
    expect(await ring(admin.client, planId)).toEqual([g3, g1, null]);

    await admin.client.patch(`/api/plans/${planId}/groups/${g2}`, { inRotation: true });
    expect(await ring(admin.client, planId)).toEqual([g3, g1, g2]);
  });

  test("a new group in rotation takes a free Ämtli", async () => {
    const { planId, groupIds } = await seedPlan(admin, { groups: 1, jobs: 2 });
    const created = await admin.client.post(`/api/plans/${planId}/groups`, { name: "Neu", members: ["Neo"] });
    expect(await ring(admin.client, planId)).toEqual([groupIds[0], created.body.id]);
  });
});

describe("rotation", () => {
  test("moves every group one Ämtli forward and logs it", async () => {
    const { planId, groupIds } = await seedPlan(admin, { groups: 3, jobs: 3 });
    const [g1, g2, g3] = groupIds;

    const preview = await admin.client.get(`/api/plans/${planId}/rotations/preview`);
    expect(preview.body.map((p: { next: { id: number } }) => p.next.id)).toEqual([g3, g1, g2]);

    const res = await admin.client.post(`/api/plans/${planId}/rotations`);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ trigger: "manual", byUserId: admin.id });
    expect(await ring(admin.client, planId)).toEqual([g3, g1, g2]);

    const log = await admin.client.get(`/api/plans/${planId}/rotations`);
    expect(log.body).toHaveLength(1);
    expect(log.body[0].before.map((s: { groupId: number }) => s.groupId)).toEqual([g1, g2, g3]);
  });

  test("no Ämtli: 400 NO_JOBS", async () => {
    const planId = await createPlan(admin);
    const res = await admin.client.post(`/api/plans/${planId}/rotations`);
    expect(res.status).toBe(400);
    expect(res.body.data.code).toBe("NO_JOBS");
  });

  test("fair policy lets an idle group rotate in", async () => {
    const { planId, groupIds } = await seedPlan(admin, { groups: 3, jobs: 2 });
    const [g1, g2, g3] = groupIds;
    expect(await ring(admin.client, planId)).toEqual([g1, g2]);

    // "slots": g3 never gets an Ämtli
    await admin.client.post(`/api/plans/${planId}/rotations`);
    expect(await ring(admin.client, planId)).toEqual([g2, g1]);

    await admin.client.patch(`/api/plans/${planId}/settings`, { idlePolicy: "fair" });
    await admin.client.post(`/api/plans/${planId}/rotations`);
    expect(await ring(admin.client, planId)).toEqual([g3, g2]);
  });
});

describe("undo", () => {
  test("restores the latest rotation", async () => {
    const { planId, groupIds } = await seedPlan(admin, { groups: 3, jobs: 3 });
    const rotation = await admin.client.post(`/api/plans/${planId}/rotations`);
    const undo = await admin.client.post(`/api/plans/${planId}/rotations/${rotation.body.id}/undo`);
    expect(undo.status).toBe(201);
    expect(undo.body.trigger).toBe("undo");
    expect(await ring(admin.client, planId)).toEqual(groupIds);

    const log = await admin.client.get(`/api/plans/${planId}/rotations`);
    expect(log.body.map((l: { trigger: string }) => l.trigger)).toEqual(["undo", "manual"]);
    expect(log.body[1].undoneAt).not.toBeNull();
  });

  test("only the latest rotation: 409 ROTATION_NOT_LATEST", async () => {
    const { planId } = await seedPlan(admin, { groups: 3, jobs: 3 });
    const first = await admin.client.post(`/api/plans/${planId}/rotations`);
    await admin.client.post(`/api/plans/${planId}/rotations`);
    const res = await admin.client.post(`/api/plans/${planId}/rotations/${first.body.id}/undo`);
    expect(res.status).toBe(409);
    expect(res.body.data.code).toBe("ROTATION_NOT_LATEST");
  });

  test("an undo cannot be undone", async () => {
    const { planId } = await seedPlan(admin, { groups: 2, jobs: 2 });
    const rotation = await admin.client.post(`/api/plans/${planId}/rotations`);
    const undo = await admin.client.post(`/api/plans/${planId}/rotations/${rotation.body.id}/undo`);
    const res = await admin.client.post(`/api/plans/${planId}/rotations/${undo.body.id}/undo`);
    expect(res.body.data.code).toBe("CANNOT_UNDO_UNDO");
  });

  test("refused when assignments were changed by hand since", async () => {
    const { planId, jobIds } = await seedPlan(admin, { groups: 2, jobs: 2 });
    const rotation = await admin.client.post(`/api/plans/${planId}/rotations`);
    await admin.client.delete(`/api/plans/${planId}/assignments/${jobIds[0]}`);
    const res = await admin.client.post(`/api/plans/${planId}/rotations/${rotation.body.id}/undo`);
    expect(res.status).toBe(409);
    expect(res.body.data.code).toBe("ROTATION_STATE_CHANGED");
  });
});
