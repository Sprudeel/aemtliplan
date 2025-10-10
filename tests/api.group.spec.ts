import { beforeAll, describe, expect, test } from "vitest";
import type { SuperAgentTest } from "supertest";
import { createTestAgent } from "./utils/http";
import { resetTestDatabase } from "~/tests/utils/test-db";

let agent: SuperAgentTest;
let id: number = 0;

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

describe("/api/group Tests", () => {
  // Create a new group
  // Test that the group is created successfully
  test("Group can be created successfully", async () => {
    const res = await agent
      .post("/api/group")
      .send({
        name: "Gruppe Chaos",
        members: ["Contenta", "Gecko"],
        color: "#C6DEF1",
      })
      .expect(200);

    expect(res).toBeDefined();
    expect(res.body.name).toBe("Gruppe Chaos");
    expect(res.body.members.length).toBe(2);
    id = res.body.id;
  });

  // Delete the created group
  test("Group can be deleted successfully", async () => {
    await agent.delete(`/api/group/delete`).send({ id }).expect(200);

    // Verify that the group has been deleted
    await agent.get(`/api/group/get`).query({ id }).expect(404);
  });

  // Test that the group appears in the list of groups
  test("Created group appears in the list of groups", async () => {
    await agent
      .post("/api/group")
      .send({
        name: "Gruppe Chaos",
        members: ["Contenta", "Gecko"],
        color: "#C6DEF1",
      })
      .expect(200);

    const res = await agent.get("/api/groups").expect(200);

    expect(res).toBeDefined();
    const groupNames = res.body.map((g: any) => g.name);
    expect(groupNames).toContain("Gruppe Chaos");
  });

  // Test that creating a group with a duplicate name fails
  test("Creating a group with duplicate name fails", async () => {
    await agent
      .post("/api/group")
      .send({
        name: "Gruppe Chaos",
        members: ["Clever", "Sueno"],
        color: "#FAEDCB",
      })
      .expect(409);
  });

  // Test that creating a group with invalid data fails
  test("Creating a group with invalid data fails", async () => {
    await agent
      .post("/api/group")
      .send({
        members: ["Clever", "Sueno"],
      })
      .expect(500);
  });
});
