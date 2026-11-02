import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { expect, inject } from "vitest";

export const prisma = new PrismaClient();
export const PASSWORD = "password123";

export interface Res<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

/** fetch with a cookie jar, like a browser tab. Sends Origin (better-auth CSRF check). */
export class Client {
  private cookies = new Map<string, string>();
  readonly baseUrl = inject("baseUrl");

  async request<T = any>(method: string, path: string, body?: unknown): Promise<Res<T>> {
    const headers: Record<string, string> = { origin: this.baseUrl };
    if (this.cookies.size) {
      headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    }
    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const response = await fetch(this.baseUrl + path, { method, headers, body: payload, redirect: "manual" });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const index = pair!.indexOf("=");
      const name = pair!.slice(0, index);
      const value = pair!.slice(index + 1);
      if (!value || /max-age=0/i.test(cookie)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // not JSON
    }
    return { status: response.status, body: parsed as T, headers: response.headers };
  }

  get = <T = any>(path: string) => this.request<T>("GET", path);
  post = <T = any>(path: string, body?: unknown) => this.request<T>("POST", path, body ?? {});
  put = <T = any>(path: string, body?: unknown) => this.request<T>("PUT", path, body ?? {});
  patch = <T = any>(path: string, body?: unknown) => this.request<T>("PATCH", path, body ?? {});
  delete = <T = any>(path: string) => this.request<T>("DELETE", path);
}

export interface TestUser {
  client: Client;
  id: string;
  email: string;
}

export async function signUp(name = "Tester"): Promise<TestUser> {
  const client = new Client();
  const email = `${name.toLowerCase()}-${randomUUID()}@example.test`;
  const res = await client.post("/api/auth/sign-up/email", { email, password: PASSWORD, name });
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return { client, id: res.body.user.id, email };
}

/** Creates a plan through better-auth; the user becomes its owner. */
export async function createPlan(owner: TestUser, name = "Testlager"): Promise<string> {
  const res = await owner.client.post("/api/auth/organization/create", {
    name,
    slug: `plan-${randomUUID()}`,
  });
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return res.body.id;
}

/** Adds a user to a plan directly in the DB (invitation flow is tested separately). */
export async function addToPlan(planId: string, user: TestUser, role: "member" | "admin" = "member") {
  await prisma.planMembership.create({
    data: { id: randomUUID(), organizationId: planId, userId: user.id, role, createdAt: new Date() },
  });
}

export async function verifyEmail(user: TestUser) {
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
}

/** Last mail link printed by the test server (no SMTP in tests). */
export function lastMailLink(to: string, contains: string): string | null {
  const log = readFileSync(inject("serverLog"), "utf8");
  const blocks = log.split("[mail] ").filter((block) => block.startsWith(`to=${to} `));
  const links = blocks.flatMap((block) => block.match(/https?:\/\/\S+/g) ?? []).filter((l) => l.includes(contains));
  return links.at(-1) ?? null;
}

/** Plan with groups + jobs; group i does job i. Returns ids. */
export async function seedPlan(
  admin: TestUser,
  options: { groups?: number; jobs?: number; assign?: boolean } = {},
) {
  const { groups = 3, jobs = 3, assign = true } = options;
  const planId = await createPlan(admin);
  const groupIds: number[] = [];
  for (let i = 0; i < groups; i++) {
    const res = await admin.client.post(`/api/plans/${planId}/groups`, {
      name: `Gruppe ${i + 1}`,
      color: "#112233",
      members: [`Person ${i + 1}a`, `Person ${i + 1}b`],
      inRotation: true, // no Ämtli exist yet, so nothing is auto-assigned
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    groupIds.push(res.body.id);
  }
  const jobIds: number[] = [];
  for (let i = 0; i < jobs; i++) {
    const res = await admin.client.post(`/api/plans/${planId}/jobs`, { name: `Ämtli ${i + 1}`, icon: "🧹" });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    jobIds.push(res.body.id);
  }
  if (assign) {
    for (let i = 0; i < Math.min(groups, jobs); i++) {
      const res = await admin.client.put(`/api/plans/${planId}/assignments/${jobIds[i]}`, { groupId: groupIds[i] });
      expect(res.status, JSON.stringify(res.body)).toBe(200);
    }
  }
  return { planId, groupIds, jobIds };
}

/** Group id per job, in ring order. */
export async function ring(client: Client, planId: string): Promise<Array<number | null>> {
  const res = await client.get(`/api/plans/${planId}/assignments`);
  expect(res.status).toBe(200);
  return res.body.map((entry: { group: { id: number } | null }) => entry.group?.id ?? null);
}
