import { beforeAll, describe, expect, test } from "vitest";
import { createPlan, seedPlan, signUp, type TestUser } from "../helpers/api";

let admin: TestUser;
beforeAll(async () => {
  admin = await signUp("Admin");
});

describe("groups", () => {
  test("create, list, update, delete", async () => {
    const planId = await createPlan(admin);
    const created = await admin.client.post(`/api/plans/${planId}/groups`, {
      name: "Wölfe",
      color: "#ff0000",
      members: [" Gecko ", "Luchs", "gecko"],
    });
    expect(created.status).toBe(201);
    expect(created.body.members.map((m: { name: string }) => m.name)).toEqual(["Gecko", "Luchs"]);

    const list = await admin.client.get(`/api/plans/${planId}/groups`);
    expect(list.body).toHaveLength(1);

    const updated = await admin.client.patch(`/api/plans/${planId}/groups/${created.body.id}`, {
      name: "Wolfsrudel",
      members: ["Gecko", "Fuchs"],
    });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe("Wolfsrudel");
    expect(updated.body.members.map((m: { name: string }) => m.name)).toEqual(["Fuchs", "Gecko"]);
    // Gecko stayed the same member row
    const gecko = (list.body[0].members as Array<{ id: number; name: string }>).find((m) => m.name === "Gecko");
    expect(updated.body.members.find((m: { name: string }) => m.name === "Gecko").id).toBe(gecko!.id);

    expect((await admin.client.delete(`/api/plans/${planId}/groups/${created.body.id}`)).status).toBe(204);
    expect((await admin.client.delete(`/api/plans/${planId}/groups/${created.body.id}`)).status).toBe(404);
  });

  test("validation errors are 400 with field issues", async () => {
    const planId = await createPlan(admin);
    const res = await admin.client.post(`/api/plans/${planId}/groups`, { name: "", color: "red", members: [] });
    expect(res.status).toBe(400);
    expect(res.body.data.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(res.body.data.issues.fieldErrors)).toEqual(expect.arrayContaining(["name", "color", "members"]));
  });

  test("duplicate group name: 409 GROUP_NAME_TAKEN", async () => {
    const planId = await createPlan(admin);
    await admin.client.post(`/api/plans/${planId}/groups`, { name: "A", members: ["x"] });
    const res = await admin.client.post(`/api/plans/${planId}/groups`, { name: "A", members: ["y"] });
    expect(res.status).toBe(409);
    expect(res.body.data.code).toBe("GROUP_NAME_TAKEN");
  });

  test("a person can only be in one group: 409 MEMBER_IN_OTHER_GROUP", async () => {
    const planId = await createPlan(admin);
    await admin.client.post(`/api/plans/${planId}/groups`, { name: "A", members: ["Contenta"] });
    const res = await admin.client.post(`/api/plans/${planId}/groups`, { name: "B", members: ["contenta"] });
    expect(res.status).toBe(409);
    expect(res.body.data).toMatchObject({ code: "MEMBER_IN_OTHER_GROUP", issues: { names: ["Contenta"] } });
  });

  test("same name is fine in another plan", async () => {
    const a = await createPlan(admin);
    const b = await createPlan(admin);
    await admin.client.post(`/api/plans/${a}/groups`, { name: "A", members: ["Contenta"] });
    expect((await admin.client.post(`/api/plans/${b}/groups`, { name: "A", members: ["Contenta"] })).status).toBe(201);
  });
});

describe("Ämtli", () => {
  test("new Ämtli are appended to the ring", async () => {
    const planId = await createPlan(admin);
    const names = ["Küche", "WC", "Holz"];
    for (const name of names) await admin.client.post(`/api/plans/${planId}/jobs`, { name });
    const list = await admin.client.get(`/api/plans/${planId}/jobs`);
    expect(list.body.map((j: { name: string; position: number }) => [j.name, j.position])).toEqual([
      ["Küche", 0],
      ["WC", 1],
      ["Holz", 2],
    ]);
  });

  test("empty name is rejected", async () => {
    const planId = await createPlan(admin);
    const res = await admin.client.post(`/api/plans/${planId}/jobs`, { name: "  " });
    expect(res.status).toBe(400);
  });

  test("duplicate name: 409 JOB_NAME_TAKEN, also on update", async () => {
    const planId = await createPlan(admin);
    await admin.client.post(`/api/plans/${planId}/jobs`, { name: "Küche" });
    const wc = await admin.client.post(`/api/plans/${planId}/jobs`, { name: "WC" });
    expect((await admin.client.post(`/api/plans/${planId}/jobs`, { name: "Küche" })).body.data.code).toBe("JOB_NAME_TAKEN");
    const rename = await admin.client.patch(`/api/plans/${planId}/jobs/${wc.body.id}`, { name: "Küche" });
    expect(rename.status).toBe(409);
  });

  test("update clears optional fields with null", async () => {
    const planId = await createPlan(admin);
    const job = await admin.client.post(`/api/plans/${planId}/jobs`, { name: "Küche", icon: "🍽️", description: "x" });
    const res = await admin.client.patch(`/api/plans/${planId}/jobs/${job.body.id}`, { description: null });
    expect(res.body).toMatchObject({ name: "Küche", icon: "🍽️", description: null });
  });

  test("delete: 404 when missing, positions close up", async () => {
    const { planId, jobIds } = await seedPlan(admin, { groups: 0, jobs: 3, assign: false });
    expect((await admin.client.delete(`/api/plans/${planId}/jobs/999999`)).status).toBe(404);
    expect((await admin.client.delete(`/api/plans/${planId}/jobs/${jobIds[0]}`)).status).toBe(204);
    const list = await admin.client.get(`/api/plans/${planId}/jobs`);
    expect(list.body.map((j: { position: number }) => j.position)).toEqual([0, 1]);
  });

  test("order must list every Ämtli exactly once", async () => {
    const { planId, jobIds } = await seedPlan(admin, { groups: 0, jobs: 3, assign: false });
    const reversed = [...jobIds].reverse();
    const ok = await admin.client.put(`/api/plans/${planId}/jobs/order`, { jobIds: reversed });
    expect(ok.status).toBe(200);
    expect(ok.body.map((j: { id: number }) => j.id)).toEqual(reversed);

    for (const bad of [[jobIds[0], jobIds[1]], [...jobIds, jobIds[0]], [jobIds[0], jobIds[1], 999999]]) {
      const res = await admin.client.put(`/api/plans/${planId}/jobs/order`, { jobIds: bad });
      expect(res.status).toBe(400);
      expect(res.body.data.code).toBe("ORDER_MISMATCH");
    }
  });

  test("routes only answer their own HTTP method", async () => {
    const planId = await createPlan(admin);
    const job = await admin.client.post(`/api/plans/${planId}/jobs`, { name: "Küche" });
    const wrong = await admin.client.post(`/api/plans/${planId}/jobs/${job.body.id}`, { name: "X" });
    expect([404, 405]).toContain(wrong.status);
  });
});
