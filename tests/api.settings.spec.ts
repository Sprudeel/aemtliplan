import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { SuperAgentTest } from "supertest";
import { promises as fsp } from "node:fs";
import { join } from "node:path";

import { createTestAgent } from "./utils/http";
import { resetTestDatabase } from "~/tests/utils/test-db";
import { DEFAULT_ROTATION_CRON } from "~/server/utils/rotation";

const runtimeConfig = { public: { rotationCron: DEFAULT_ROTATION_CRON } };
const rotationMocks = vi.hoisted(() => ({
  syncRotationScheduleMock: vi.fn(),
}));

vi.mock("~/server/services/rotationScheduler", () => ({
  syncRotationSchedule: rotationMocks.syncRotationScheduleMock,
}));

const syncRotationScheduleMock = rotationMocks.syncRotationScheduleMock;

let agent: SuperAgentTest;
let savedCron: string | null = null;
let lastBackgroundPath: string | null = null;

beforeAll(async () => {
  await resetTestDatabase();
  agent = createTestAgent() as unknown as SuperAgentTest;
  await agent
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "password" })
    .expect(200);
});

beforeEach(() => {
  runtimeConfig.public.rotationCron = DEFAULT_ROTATION_CRON;
  syncRotationScheduleMock.mockClear();
});

afterAll(async () => {
  if (!lastBackgroundPath) return;
  const absolute = join(
    process.cwd(),
    "public",
    lastBackgroundPath.replace(/^\//, ""),
  );
  try {
    await fsp.unlink(absolute);
  } catch {}
});

describe("Settings API - cronsetting", () => {
  test("GET returns runtime fallback when no cron is stored", async () => {
    const res = await agent.get("/api/settings/cronsetting").expect(200);
    expect(res.body).toEqual({ cron: "0 17 * * *" });
  });

  test("POST with valid cron persists value and updates schedule", async () => {
    const cron = "0 6 * * 1";

    const res = await agent
      .post("/api/settings/cronsetting")
      .send({ cron })
      .expect(200);

    expect(res.body).toEqual({ cron });
    expect(syncRotationScheduleMock).toHaveBeenCalledTimes(1);
    expect(syncRotationScheduleMock).toHaveBeenCalledWith(cron, DEFAULT_ROTATION_CRON);

    const after = await agent.get("/api/settings/cronsetting").expect(200);
    expect(after.body).toEqual({ cron });
    savedCron = cron;
  });

  test("POST with invalid cron returns 400 and keeps previous value", async () => {
    await agent
      .post("/api/settings/cronsetting")
      .send({ cron: "not a cron" })
      .expect(400);

    expect(syncRotationScheduleMock).not.toHaveBeenCalled();

    const after = await agent.get("/api/settings/cronsetting").expect(200);
    expect(after.body).toEqual({ cron: savedCron });
  });

  test("POST with empty cron clears stored value and disables schedule", async () => {
    const res = await agent
      .post("/api/settings/cronsetting")
      .send({ cron: "" })
      .expect(200);

    expect(res.body).toEqual({ cron: "" });
    expect(syncRotationScheduleMock).toHaveBeenCalledWith(null, DEFAULT_ROTATION_CRON);

    const after = await agent.get("/api/settings/cronsetting").expect(200);
    expect(after.body).toEqual({ cron: "0 17 * * *" });
    savedCron = null;
  });
});

describe("Settings API - background image", () => {
  test("GET returns null when no background is set", async () => {
    const res = await agent.get("/api/settings/background").expect(200);
    expect(res.body).toEqual({ path: null });
  });

  test("POST uploads a background image and stores file", async () => {
    const res = await agent
      .post("/api/settings/background")
      .attach(
        "file",
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        { filename: "background.png", contentType: "image/png" },
      )
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.path).toMatch(/^\/uploads\/background-\d+\.png$/);

    const absolute = join(
      process.cwd(),
      "public",
      res.body.path.replace(/^\//, ""),
    );
    await expect(fsp.access(absolute)).resolves.toBeUndefined();

    const after = await agent.get("/api/settings/background").expect(200);
    expect(after.body).toEqual({ path: res.body.path });

    lastBackgroundPath = res.body.path;
  });

  test("POST rejects unsupported mime types", async () => {
    await agent
      .post("/api/settings/background")
      .attach(
        "file",
        Buffer.from("plain"),
        { filename: "note.txt", contentType: "text/plain" },
      )
      .expect(415);

    if (lastBackgroundPath) {
      const after = await agent.get("/api/settings/background").expect(200);
      expect(after.body).toEqual({ path: lastBackgroundPath });
    }
  });

  test("DELETE removes background setting and file", async () => {
    if (!lastBackgroundPath) {
      throw new Error("No background set to delete");
    }
    await agent.delete("/api/settings/background").expect(200);

    const after = await agent.get("/api/settings/background").expect(200);
    expect(after.body).toEqual({ path: null });

    const absolute = join(
      process.cwd(),
      "public",
      lastBackgroundPath.replace(/^\//, ""),
    );
    await expect(fsp.access(absolute)).rejects.toThrow();

    lastBackgroundPath = null;
  });
});
