import path from "node:path";
import { defineVitestProject } from "@nuxt/test-utils/config";
import { defineConfig } from "vitest/config";

const alias = { "~": path.resolve(import.meta.dirname, "."), "#": path.resolve(import.meta.dirname, ".") };

// Three projects:
// - unit:  pure functions (server + app utils, translations) and DB services
// - nuxt:  Vue components in a Nuxt environment (happy-dom)
// - api:   builds the real Nuxt server once and calls it over HTTP (routing included)
// unit + api use the Postgres test DB from .env.test (see tests/setup/env.ts).
// Browser end-to-end tests run separately with Playwright (tests/e2e, `npm run test:e2e`).
export default defineConfig({
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
      await defineVitestProject({
        test: {
          name: "nuxt",
          environment: "nuxt",
          include: ["tests/nuxt/**/*.spec.ts"],
          environmentOptions: { nuxt: { domEnvironment: "happy-dom" } },
        },
      }),
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
