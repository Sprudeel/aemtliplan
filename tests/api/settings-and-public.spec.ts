import { beforeAll, describe, expect, test } from "vitest";
import { Client, createPlan, seedPlan, signUp, type TestUser } from "../helpers/api";

let admin: TestUser;
beforeAll(async () => {
  admin = await signUp("Admin");
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function upload(bytes: Uint8Array, name = "bild.png", type = "image/png") {
  const form = new FormData();
  form.append("file", new Blob([bytes as Uint8Array<ArrayBuffer>], { type }), name);
  return form;
}

describe("settings", () => {
  test("server computes the next rotation; off means null", async () => {
    const planId = await createPlan(admin);
    const on = await admin.client.patch(`/api/plans/${planId}/settings`, {
      rotationEnabled: true,
      rotationTime: "07:00",
      timezone: "Europe/Zurich",
    });
    expect(on.status).toBe(200);
    const next = new Date(on.body.nextRotationAt);
    expect(next.getTime()).toBeGreaterThan(Date.now());
    expect(next.getTime() - Date.now()).toBeLessThanOrEqual(24 * 3600 * 1000);
    expect(new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", timeStyle: "short" }).format(next)).toBe("07:00");

    const off = await admin.client.patch(`/api/plans/${planId}/settings`, { rotationEnabled: false });
    expect(off.body.nextRotationAt).toBeNull();
    expect((await admin.client.get(`/api/plans/${planId}`)).body.nextRotationAt).toBeNull();
  });

  test("invalid values: 400", async () => {
    const planId = await createPlan(admin);
    for (const body of [{ rotationTime: "25:00" }, { timezone: "Nowhere/City" }, { idlePolicy: "random" }, {}]) {
      expect((await admin.client.patch(`/api/plans/${planId}/settings`, body)).status).toBe(400);
    }
  });
});

describe("background image", () => {
  test("upload, serve, replace, delete", async () => {
    const planId = await createPlan(admin);
    const up = await admin.client.put(`/api/plans/${planId}/background`, upload(PNG));
    expect(up.status, JSON.stringify(up.body)).toBe(200);
    const file = await fetch(new Client().baseUrl + up.body.url);
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("image/png");

    const second = await admin.client.put(`/api/plans/${planId}/background`, upload(PNG));
    expect((await fetch(new Client().baseUrl + up.body.url)).status).toBe(404); // old file removed

    expect((await admin.client.delete(`/api/plans/${planId}/background`)).status).toBe(204);
    expect((await fetch(new Client().baseUrl + second.body.url)).status).toBe(404);
  });

  test("checks the content, not the file name: 415", async () => {
    const planId = await createPlan(admin);
    const fake = new TextEncoder().encode("<svg onload=alert(1)></svg>");
    const res = await admin.client.put(`/api/plans/${planId}/background`, upload(fake, "evil.png"));
    expect(res.status).toBe(415);
  });

  test("9 MB is accepted", async () => {
    const planId = await createPlan(admin);
    const nine = new Uint8Array(9 * 1024 * 1024);
    nine.set(PNG);
    expect((await admin.client.put(`/api/plans/${planId}/background`, upload(nine))).status).toBe(200);
    await admin.client.delete(`/api/plans/${planId}/background`);
  });

  test("more than 10 MB: 413", async () => {
    const planId = await createPlan(admin);
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(PNG);
    const res = await admin.client.put(`/api/plans/${planId}/background`, upload(big));
    expect(res.status).toBe(413);
    expect(res.body.data.code).toBe("FILE_TOO_LARGE");
  });
});

describe("public view", () => {
  test("private plans are not visible", async () => {
    const planId = await createPlan(admin);
    const slug = (await admin.client.get(`/api/plans/${planId}`)).body.settings.publicSlug;
    expect((await new Client().get(`/api/public/${slug}`)).status).toBe(404);
  });

  test("public plan shows Ämtli and groups; member names only if allowed", async () => {
    const { planId } = await seedPlan(admin, { groups: 2, jobs: 2 });
    await admin.client.patch(`/api/plans/${planId}/settings`, { visibility: "public" });
    const slug = (await admin.client.get(`/api/plans/${planId}`)).body.settings.publicSlug;

    const anon = new Client();
    const hidden = await anon.get(`/api/public/${slug}`);
    expect(hidden.status).toBe(200);
    expect(hidden.body.items[0]).toEqual({
      job: { name: "Ämtli 1", icon: "🧹", description: null },
      group: { name: "Gruppe 1", color: "#112233" },
    });

    await admin.client.patch(`/api/plans/${planId}/settings`, { showMemberNames: true });
    const shown = await anon.get(`/api/public/${slug}`);
    expect(shown.body.items[0].group.members).toEqual(["Person 1a", "Person 1b"]);
  });

  test("live updates: SSE sends 'changed' after a rotation", async () => {
    const { planId } = await seedPlan(admin, { groups: 2, jobs: 2 });
    await admin.client.patch(`/api/plans/${planId}/settings`, { visibility: "public" });
    const slug = (await admin.client.get(`/api/plans/${planId}`)).body.settings.publicSlug;

    const controller = new AbortController();
    const response = await fetch(`${new Client().baseUrl}/api/public/${slug}/events`, { signal: controller.signal });
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    let received = "";
    const readUntil = async (needle: string) => {
      while (!received.includes(needle)) {
        const { value, done } = await reader.read();
        if (done) break;
        received += decoder.decode(value);
      }
    };

    await readUntil("event: ready");
    await admin.client.post(`/api/plans/${planId}/rotations`);
    await readUntil("event: changed");
    controller.abort();
    expect(received).toContain('"reason":"rotation"');
  });
});
