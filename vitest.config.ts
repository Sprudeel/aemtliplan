import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = { "~": path.resolve(__dirname, "."), "#": path.resolve(__dirname, ".") };

// Two projects:
// - unit: pure functions + DB services, imported directly
// - api:  builds the real Nuxt server once and calls it over HTTP (routing included)
// Both use the Postgres test DB from .env.test (see tests/setup/env.ts).
export default defineConfig({
  resolve: { alias },
  test: {
    hookTimeout: 300_000,
    testTimeout: 30_000,
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.spec.ts"],
          setupFiles: ["./tests/setup/env.ts"],
          globalSetup: ["./tests/setup/database.ts"],
          fileParallelism: false,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "api",
          environment: "node",
          include: ["tests/api/**/*.spec.ts"],
          setupFiles: ["./tests/setup/env.ts"],
          globalSetup: ["./tests/setup/database.ts", "./tests/setup/server.ts"],
          fileParallelism: false,
          hookTimeout: 300_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
