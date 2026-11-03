// Started by Playwright (webServer). Prepares the *_test DB, builds and runs the test server.
import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const envFile = path.join(root, ".env.test");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const url = process.env.DATABASE_URL ?? "";
if (!/\/[\w-]+_test(\?|$)/.test(url)) {
  console.error(`E2E tests only run against a database whose name ends in _test, got: "${url}"`);
  process.exit(1);
}

execSync("npx prisma migrate deploy", { cwd: root, stdio: "inherit" });
if (process.env.SKIP_BUILD !== "1") {
  execSync("npx nuxt build", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production", AEMTLIPLAN_TEST_BUILD: "1" },
  });
}

const server = spawn("node", [".output-test/server/index.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: "3999", HOST: "127.0.0.1", NODE_ENV: "production" },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
