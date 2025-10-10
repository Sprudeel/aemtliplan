import { beforeAll, describe, expect, test } from "vitest";
import type { SuperAgentTest } from "supertest";
import { createTestAgent } from "./utils/http";
import { resetTestDatabase } from "~/tests/utils/test-db";

let agent: SuperAgentTest;
let createdJobId: number;

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

describe("Jobs API", () => {
  test("Seed data jobs are listed", async () => {
    const res = await agent.get("/api/jobs/jobs").expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const jobNames = res.body.map((job: any) => job.name);
    expect(jobNames).toContain("Haupthalle");
  });

  test("Job can be created successfully", async () => {
    const res = await agent
      .post("/api/jobs/job")
      .send({
        name: "Recycling",
        description: "Abfall entsorgen",
        icon: "recycle",
      })
      .expect(200);

    expect(res.body.name).toBe("Recycling");
    createdJobId = res.body.id;
  });

  test("Job can be updated successfully", async () => {
    const res = await agent
      .post("/api/jobs/job.update")
      .send({
        id: createdJobId,
        name: "Putzen",
        description: "Aufenthaltsraum putzen",
        icon: "broom",
      })
      .expect(200);

    expect(res.body.name).toBe("Putzen");
    expect(res.body.description).toBe("Aufenthaltsraum putzen");
  });

  test("Rotation order can be updated", async () => {
    const list = await agent.get("/api/jobs/jobs").expect(200);
    const ids: number[] = list.body.map((job: any) => job.id);
    expect(ids.length).toBeGreaterThan(1);

    const reordered = [...ids];
    const index = reordered.indexOf(createdJobId);
    if (index > 0) {
      const [picked] = reordered.splice(index, 1);
      reordered.unshift(picked);
    }

    const res = await agent
      .post("/api/jobs/rotationorder")
      .send({ order: reordered })
      .expect(200);

    expect(res.body).toMatchObject({ ok: true, count: reordered.length });

    const after = await agent.get("/api/jobs/jobs").expect(200);
    const pointerById = new Map<number, number>(
      after.body.map((job: any) => [job.id, job.rotationPointer]),
    );

    reordered.forEach((id, position) => {
      expect(pointerById.get(id)).toBe(position);
    });
  });

  test("Creating a job with duplicate name fails", async () => {
    await agent
      .post("/api/jobs/job")
      .send({
        name: "Haupthalle",
        description: "Duplicate",
        icon: "broom",
      })
      .expect(409);
  });

  test("Job can be deleted successfully", async () => {
    await agent.delete("/api/jobs/job").send({ id: createdJobId }).expect(200);

    const res = await agent.get("/api/jobs/jobs").expect(200);
    const remaining = res.body.find((job: any) => job.id === createdJobId);
    expect(remaining).toBeUndefined();
  });
});
