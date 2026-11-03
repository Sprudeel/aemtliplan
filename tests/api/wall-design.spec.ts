import { beforeAll, describe, expect, test } from "vitest";
import { defaultWallDesign } from "~/shared/wall-design";
import { addToPlan, Client, seedPlan, signUp, type TestUser } from "../helpers/api";

let admin: TestUser;
beforeAll(async () => {
  admin = await signUp("Designer");
});

describe("wall design", () => {
  test("defaults when nothing is saved", async () => {
    const { planId } = await seedPlan(admin, { groups: 1, jobs: 1 });
    const res = await admin.client.get(`/api/plans/${planId}/wall-design`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(defaultWallDesign());
  });

  test("admin saves; public view returns design and matching item keys", async () => {
    const { planId, jobIds } = await seedPlan(admin, { groups: 2, jobs: 2 });
    const design = defaultWallDesign();
    design.card.preset = "night";
    design.background.kind = "pattern";
    design.widgets.qr.enabled = true;
    design.layouts.tv = { items: { [`job:${jobIds[0]}`]: { x: 10, y: 20, w: 30, h: 25, rotate: -5, z: 3, hidden: false } } };

    const put = await admin.client.put(`/api/plans/${planId}/wall-design`, design);
    expect(put.status, JSON.stringify(put.body)).toBe(200);
    expect((await admin.client.get(`/api/plans/${planId}/wall-design`)).body).toEqual(design);

    await admin.client.patch(`/api/plans/${planId}/settings`, { visibility: "public" });
    const slug = (await admin.client.get(`/api/plans/${planId}`)).body.settings.publicSlug;
    const view = await new Client().get(`/api/public/${slug}`);
    expect(view.body.design).toEqual(design);
    expect(view.body.items.map((i: { key: string }) => i.key)).toEqual(jobIds.map((id) => `job:${id}`));
  });

  test("viewers cannot change it: 403", async () => {
    const { planId } = await seedPlan(admin, { groups: 1, jobs: 1 });
    const viewer = await signUp("Viewer");
    await addToPlan(planId, viewer, "member");
    expect((await viewer.client.get(`/api/plans/${planId}/wall-design`)).status).toBe(200);
    expect((await viewer.client.put(`/api/plans/${planId}/wall-design`, defaultWallDesign())).status).toBe(403);
  });

  test("invalid documents are rejected: 400", async () => {
    const { planId } = await seedPlan(admin, { groups: 1, jobs: 1 });
    const design = defaultWallDesign() as unknown as Record<string, any>;
    design.layouts = { phone: { items: { "job:1": { x: 150, y: 0, w: 10, h: 10 } } } };
    const res = await admin.client.put(`/api/plans/${planId}/wall-design`, design);
    expect(res.status).toBe(400);
    expect(res.body.data.code).toBe("VALIDATION_FAILED");
    expect((await admin.client.put(`/api/plans/${planId}/wall-design`, { version: 2 })).status).toBe(400);
  });
});
