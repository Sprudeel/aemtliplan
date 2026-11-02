import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";

// Set only by tests/setup/server.ts: builds a separate test server into .output-test.
const isTestBuild = process.env.AEMTLIPLAN_TEST_BUILD === "1";

export default defineNuxtConfig({
  devtools: { enabled: true },
  build: {
    transpile: ["vuetify"],
  },
  security: {
    // Global limit per IP (default would be 150 per 5 min, too low for dashboard + wall screen).
    // Login/sign-up have their own stricter limit in better-auth.
    rateLimiter: isTestBuild ? false : { tokensPerInterval: 300, interval: 60_000 },
    // Default upload cap is 8 MB; backgrounds may be 10 MB (checked exactly in background.put.ts).
    requestSizeLimiter: {
      maxRequestSizeInBytes: 2_000_000,
      maxUploadFileRequestInBytes: 11 * 1024 * 1024,
    },
  },
  runtimeConfig: {},
  nitro: {
    // Uploaded files (plan backgrounds). Swap the driver for S3 in production.
    storage: {
      uploads: { driver: "fs", base: "./.data/uploads" },
    },
    ...(isTestBuild && { output: { dir: ".output-test" } }),
  },
  modules: [
    "nuxt-security",
    "@nuxtjs/tailwindcss",
    (_options, nuxt) => {
      nuxt.hooks.hook("vite:extendConfig", (config) => {
        // @ts-expect-error
        config.plugins.push(vuetify({ autoImport: true }));
      });
    },
  ],
  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },
});
