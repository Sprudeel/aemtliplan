import { spawn, execSync, type ChildProcess } from "node:child_process";
import { createWriteStream, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TestProject } from "vitest/node";
import { loadTestEnv } from "./env";

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
    serverLog: string;
  }
}

const root = path.resolve(__dirname, "../..");

/** Builds the Nuxt app once and runs the production server against the test DB. */
export default async function setup(project: TestProject) {
  loadTestEnv();
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3999";
  const port = new URL(baseUrl).port || "3999";

  if (process.env.SKIP_BUILD !== "1") {
    execSync("npx nuxt build", {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production", AEMTLIPLAN_TEST_BUILD: "1" },
    });
  }

  // Server output (incl. mails printed by server/utils/mail.ts) goes to a file tests can read.
  const logFile = path.join(mkdtempSync(path.join(tmpdir(), "aemtliplan-test-")), "server.log");
  const log = createWriteStream(logFile);
  const server: ChildProcess = spawn("node", [".output-test/server/index.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: port, HOST: "127.0.0.1", NODE_ENV: "production" },
  });
  server.stdout?.pipe(log);
  server.stderr?.pipe(log);

  await waitForServer(baseUrl, server);
  project.provide("baseUrl", baseUrl);
  project.provide("serverLog", logFile);

  return async () => {
    server.kill();
    log.end();
  };
}

async function waitForServer(baseUrl: string, server: ChildProcess) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Test server exited with ${server.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/auth/ok`);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Test server did not start within 60s");
}
