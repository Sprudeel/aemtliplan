import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/vitest.setup.ts"],
    pool: "threads",
    include: ["tests/**/*.spec.ts"],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "."), // so ~/server/utils/prisma works
      "#": path.resolve(__dirname, "."), // optional, Nuxt also uses #
      "@": path.resolve(__dirname, "."), // optional convenience
    },
  },
});
