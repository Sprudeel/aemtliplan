import { beforeAll, describe, expect, test, vi } from "vitest";
import type { Response, SuperAgentTest } from "supertest";

import { createTestAgent } from "./utils/http";
import { resetTestDatabase } from "~/tests/utils/test-db";
import { DEFAULT_ROTATION_CRON } from "~/server/utils/rotation";

type ApiUser = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

const rotationMocks = vi.hoisted(() => ({
  syncRotationScheduleMock: vi.fn(),
}));


vi.mock("~/server/services/rotationScheduler", () => ({
  syncRotationSchedule: rotationMocks.syncRotationScheduleMock,
}));

let adminAgent: SuperAgentTest;
let adminUserId: number;
const registeredUser = {
  id: 0,
  email: "",
  password: "",
};

beforeAll(async () => {
  await resetTestDatabase();
  adminAgent = createTestAgent() as unknown as SuperAgentTest;
  const res = await adminAgent
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "password" })
    .expect(200);
  adminUserId = res.body.id;
});

describe("Authentication API", () => {
  test("Login fails with invalid credentials", async () => {
    const agent = createTestAgent() as unknown as SuperAgentTest;
    await agent
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "wrongpass" })
      .expect(401);
  });

  test("Login returns user info and establishes session", async () => {
    const agent = createTestAgent() as unknown as SuperAgentTest;
    const res = await agent
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "password" })
      .expect(200);

    expect(res.body).toMatchObject({
      email: "admin@example.com",
      role: "ADMIN",
    });

    const me = await agent.get("/api/user").expect(200);
    expect(me.body).toMatchObject({ email: "admin@example.com" });
  });

  test("Logout clears the current session", async () => {
    const agent = createTestAgent() as unknown as SuperAgentTest;
    await agent
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "password" })
      .expect(200);

    await agent.post("/api/auth/logout").expect(200);

    const me = await agent.get("/api/user").expect(401);
  });

  test("Admin can register a new user", async () => {
    const email = "auth.user@example.com";
    const password = "supersecure";

    const res = await adminAgent
      .post("/api/auth/register")
      .send({ email, password, name: "Auth User" })
      .expect(200);

    expect(res.body).toMatchObject({
      email,
      name: "Auth User",
      role: "USER",
    });

    registeredUser.id = res.body.id;
    registeredUser.email = email;
    registeredUser.password = password;
  });

  test("Non-admin users cannot register additional users", async () => {
    expect(registeredUser.email).not.toBe("");

    const agent = createTestAgent() as unknown as SuperAgentTest;
    await agent
      .post("/api/auth/login")
      .send({ email: registeredUser.email, password: registeredUser.password })
      .expect(200);

    await agent
      .post("/api/auth/register")
      .send({ email: "blocked@example.com", password: "supersecure", name: "Blocked" })
      .expect(403);
  });

  test("Users can change their password with the correct current password", async () => {
    const agent = createTestAgent() as unknown as SuperAgentTest;
    await agent
      .post("/api/auth/login")
      .send({ email: registeredUser.email, password: registeredUser.password })
      .expect(200);

    await agent
      .post("/api/auth/password")
      .send({ currentPassword: "wrongpassword", newPassword: "updatedSecret" })
      .expect(400);

    const newPassword = "updatedSecret";

    await agent
      .post("/api/auth/password")
      .send({ currentPassword: registeredUser.password, newPassword })
      .expect(200);

    await agent.post("/api/auth/logout").expect(200);

    const oldAgent = createTestAgent() as unknown as SuperAgentTest;
    await oldAgent
      .post("/api/auth/login")
      .send({ email: registeredUser.email, password: registeredUser.password })
      .expect(401);

    const newAgent = createTestAgent() as unknown as SuperAgentTest;
    await newAgent
      .post("/api/auth/login")
      .send({ email: registeredUser.email, password: newPassword })
      .expect(200);

    registeredUser.password = newPassword;
  });
});

describe("Users API", () => {
  let regularUserAgent: SuperAgentTest;
  let regularUserId: number;
  let deleteUserId: number;
  const regularUser = {
    email: "regular.user@example.com",
    password: "regularPass1",
  };
  const deleteUser = {
    email: "delete.me@example.com",
    password: "deletePass1",
  };
  const readUserList = (res: Response) => {
    const raw = Array.isArray(res.body) ? res.body : JSON.parse(res.text ?? "[]");
    console.log(raw);
    if (!Array.isArray(raw)) {
      throw new Error("Expected Users API to return an array");
    }
    return raw as ApiUser[];
  };

  beforeAll(async () => {
    // ensure admin session is active
    await adminAgent
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "password" })
      .expect(200);

    const regularRes = await adminAgent
      .post("/api/auth/register")
      .send({
        email: regularUser.email,
        password: regularUser.password,
        name: "Regular User",
      })
      .expect(200);
    regularUserId = regularRes.body.id;

    const deleteRes = await adminAgent
      .post("/api/auth/register")
      .send({
        email: deleteUser.email,
        password: deleteUser.password,
        name: "Delete Me",
      })
      .expect(200);
    deleteUserId = deleteRes.body.id;

    regularUserAgent = createTestAgent() as unknown as SuperAgentTest;
    await regularUserAgent
      .post("/api/auth/login")
      .send({ email: regularUser.email, password: regularUser.password })
      .expect(200);
  });

  test("Admin can list all users", async () => {
    const res = await adminAgent.get("/api/users/users").expect(200);
    const users = readUserList(res);
    expect(users.length).toBeGreaterThanOrEqual(2);

    const emails = users.map((user) => user.email);
    expect(emails).toEqual(
      expect.arrayContaining([
        "admin@example.com",
        regularUser.email,
      ]),
    );
    if (registeredUser.email) {
      expect(emails).toContain(registeredUser.email);
    }

    const requiredProps = ["id", "email", "name", "role", "createdAt"];
    users.forEach((user) => {
      requiredProps.forEach((prop) => {
        expect(user).toHaveProperty(prop);
      });
    });
  });

  test("Non-admin users cannot list all users", async () => {
    await regularUserAgent.get("/api/users/users").expect(403);
  });

  test("Admin cannot delete themselves", async () => {
    await adminAgent
      .delete("/api/users/user")
      .send({ id: adminUserId })
      .expect(400);
  });

  test("Admin can delete another user", async () => {
    await adminAgent
      .delete("/api/users/user")
      .send({ id: deleteUserId })
      .expect(200);

    const list = await adminAgent.get("/api/users/users").expect(200);
    const emails = readUserList(list).map((user) => user.email);
    expect(emails).not.toContain(deleteUser.email);

    const agent = createTestAgent() as unknown as SuperAgentTest;
    await agent
      .post("/api/auth/login")
      .send({ email: deleteUser.email, password: deleteUser.password })
      .expect(401);
  });

  test("Deleting a non-existent user returns 404", async () => {
    await adminAgent
      .delete("/api/users/user")
      .send({ id: deleteUserId })
      .expect(404);
  });
});
