import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { PrismaClient } from "@prisma/client";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

// Importing @prisma/client already loads .env (the dev DB) into process.env, so the
// test DB URL is read from .env.test directly and passed to the client explicitly.
const envFile = path.resolve(import.meta.dirname, "../../.env.test");
const testDbUrl = existsSync(envFile)
  ? parseEnv(readFileSync(envFile, "utf8")).DATABASE_URL
  : process.env.DATABASE_URL; // CI: set in the environment
if (!testDbUrl || !/\/[\w-]+_test(\?|$)/.test(testDbUrl)) {
  throw new Error(`E2E helpers only use a database whose name ends in _test, got: "${testDbUrl}"`);
}

export const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
export const PASSWORD = "password123";
const ORIGIN = "http://localhost:3999";

export interface E2EUser {
  name: string;
  email: string;
  id: string;
}

/** Signs up through the API; the page's browser context gets the session cookie. */
export async function signUpApi(request: APIRequestContext, name = "Leiterin"): Promise<E2EUser> {
  const email = `${name.toLowerCase()}-${randomUUID().slice(0, 8)}@example.test`;
  const res = await request.post("/api/auth/sign-up/email", {
    data: { email, password: PASSWORD, name },
    headers: { origin: ORIGIN },
  });
  expect(res.ok(), await res.text()).toBe(true);
  const body = await res.json();
  return { name, email, id: body.user.id };
}

export async function createPlanApi(request: APIRequestContext, name = "Sommerlager"): Promise<string> {
  const res = await request.post("/api/auth/organization/create", {
    data: { name, slug: `e2e-${randomUUID()}` },
    headers: { origin: ORIGIN },
  });
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()).id;
}

/** Plan with groups and Ämtli; group i does Ämtli i. */
export async function seedPlanApi(request: APIRequestContext, groups: string[], jobs: string[]) {
  const planId = await createPlanApi(request);
  const groupIds: number[] = [];
  for (const [i, name] of groups.entries()) {
    const res = await request.post(`/api/plans/${planId}/groups`, {
      data: { name, color: ["#A81B00", "#00A819", "#0014A8", "#A8009A"][i % 4], members: [`${name} Person`] },
      headers: { origin: ORIGIN },
    });
    expect(res.ok(), await res.text()).toBe(true);
    groupIds.push((await res.json()).id);
  }
  const jobIds: number[] = [];
  for (const name of jobs) {
    const res = await request.post(`/api/plans/${planId}/jobs`, { data: { name }, headers: { origin: ORIGIN } });
    expect(res.ok(), await res.text()).toBe(true);
    jobIds.push((await res.json()).id);
  }
  for (let i = 0; i < Math.min(groupIds.length, jobIds.length); i++) {
    await request.put(`/api/plans/${planId}/assignments/${jobIds[i]}`, {
      data: { groupId: groupIds[i] },
      headers: { origin: ORIGIN },
    });
  }
  return { planId, groupIds, jobIds };
}

export async function addMembership(planId: string, userId: string, role: "member" | "admin") {
  await prisma.planMembership.create({
    data: { id: randomUUID(), organizationId: planId, userId, role, createdAt: new Date() },
  });
}

/** Fills the login form. `navigate: false` keeps the current /login?redirect=... URL. */
export async function loginUi(page: Page, email: string, password = PASSWORD, { navigate = true } = {}) {
  if (navigate) await page.goto("/login");
  // Clicking before Vue has hydrated the form would submit it natively.
  await page.waitForLoadState("networkidle");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
}

/** Group name per Ämtli as shown in the planner ring, top to bottom. */
export async function ringGroups(page: Page): Promise<string[]> {
  return page.locator('[data-testid="ring"] .ring-item [data-testid^="drop-"]').allInnerTexts();
}
