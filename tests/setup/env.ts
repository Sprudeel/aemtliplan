import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Loads .env.test (locally) or uses the environment as is (CI), then refuses to
 * run against anything but a *_test database.
 */
export function loadTestEnv() {
  const file = path.resolve(__dirname, "../../.env.test");
  if (existsSync(file)) {
    // Test values win over whatever is in the shell.
    for (const key of ["DATABASE_URL", "BETTER_AUTH_URL", "BETTER_AUTH_SECRET"]) delete process.env[key];
    process.loadEnvFile(file);
  }
  const url = process.env.DATABASE_URL ?? "";
  if (!/\/[\w-]+_test(\?|$)/.test(url)) {
    throw new Error(`Tests only run against a database whose name ends in _test, got: "${url}"`);
  }
}

loadTestEnv();
