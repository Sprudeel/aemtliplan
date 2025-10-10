import { beforeAll, describe, expect, test } from "vitest";
import type { SuperAgentTest } from "supertest";
import { createTestAgent } from "./utils/http";
import { resetTestDatabase } from "~/tests/utils/test-db";

let agent: SuperAgentTest;
let jobIdToAssign: number = 0;
let originalGroupId: number | null = null;
let replacementGroupId: number = 0;

beforeAll(async () => {
  await resetTestDatabase();
  agent = createTestAgent() as unknown as SuperAgentTest;
  await agent
    .post("/api/auth/login")
    .send({
      email: "admin@example.com",
      password: "password",
    })
    .expect(200);
});

describe("Matchings API", () => {
  test("Seed data matchings are returned", async () => {
    const res = await agent.get("/api/matchings/matchings").expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const withGroup = res.body.find((entry: any) => entry?.group);
    expect(withGroup).toBeTruthy();

    jobIdToAssign = withGroup.jobId;
    originalGroupId = withGroup.group?.id ?? null;

    const alternate = res.body.find(
      (entry: any) => entry?.group && entry.group.id !== originalGroupId,
    );

    if (alternate?.group?.id) {
      replacementGroupId = alternate.group.id;
    } else {
      const newRes = await agent
        .get("/api/matchings/matchings.new")
        .expect(200);
      const candidate = newRes.body.groups.find(
        (group: any) => group?.id && group.id !== originalGroupId,
      );
      expect(candidate).toBeTruthy();
      replacementGroupId = candidate.id;
    }

    expect(typeof jobIdToAssign).toBe("number");
    expect(typeof replacementGroupId).toBe("number");
  });

  test("Rotation preview provides data", async () => {
    const res = await agent.get("/api/matchings/matchings-preview").expect(200);

    expect(typeof res.body?.step).toBe("number");
    expect(res.body.step).toBeGreaterThanOrEqual(0);
    expect(typeof res.body?.totalJobs).toBe("number");
    expect(res.body.totalJobs).toBeGreaterThan(0);
    expect(Array.isArray(res.body?.jobs)).toBe(true);
    expect(res.body.jobs.length).toBe(res.body.totalJobs);
  });

  test("Group can be reassigned to a job", async () => {
    const res = await agent
      .post("/api/matchings/matching")
      .send({ jobId: jobIdToAssign, groupId: replacementGroupId })
      .expect(200);

    expect(res.body.groupId).toBe(replacementGroupId);

    const list = await agent.get("/api/matchings/matchings").expect(200);
    const updated = list.body.find(
      (entry: any) => entry.jobId === jobIdToAssign,
    );
    expect(updated?.groupId).toBe(replacementGroupId);
  });

  test("Assigning an unknown group fails", async () => {
    await agent
      .post("/api/matchings/matching")
      .send({ jobId: jobIdToAssign, groupId: 999999 })
      .expect(404);
  });

  test("Assignment can be cleared", async () => {
    await agent
      .delete("/api/matchings/matching")
      .send({ jobId: jobIdToAssign })
      .expect(200);

    const list = await agent.get("/api/matchings/matchings").expect(200);
    const removed = list.body.find(
      (entry: any) => entry.jobId === jobIdToAssign,
    );
    expect(removed).toBeUndefined();
  });
});
