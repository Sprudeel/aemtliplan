// Set only by the test setup: builds a separate test server into .output-test.
const isTestBuild = process.env.AEMTLIPLAN_TEST_BUILD === "1";

export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  devtools: { enabled: true },

  modules: ["@nuxt/ui", "@nuxtjs/i18n", "nuxt-security"],

  css: ["~/assets/css/main.css"],

  // Fonts offered in the wall designer (self-hosted by @nuxt/fonts at build time).
  fonts: {
    families: [
      { name: "Nunito", provider: "google", weights: [400, 600, 700, 800] },
      { name: "Fredoka", provider: "google", weights: [400, 600] },
      { name: "Patrick Hand", provider: "google", weights: [400] },
      { name: "Roboto Slab", provider: "google", weights: [400, 700] },
      { name: "Space Grotesk", provider: "google", weights: [400, 700] },
    ],
  },

  i18n: {
    defaultLocale: "de",
    // Same URLs for every language; the choice is kept in a cookie.
    strategy: "no_prefix",
    locales: [
      { code: "de", language: "de-CH", name: "Deutsch", file: "de.json" },
      { code: "fr", language: "fr-CH", name: "Français", file: "fr.json" },
      { code: "it", language: "it-CH", name: "Italiano", file: "it.json" },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "aemtliplan_locale",
      fallbackLocale: "de",
      redirectOn: "root",
    },
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

  nitro: {
    // Uploaded files (plan backgrounds). Swap the driver for S3 in production.
    storage: {
      uploads: { driver: "fs", base: "./.data/uploads" },
    },
    ...(isTestBuild && { output: { dir: ".output-test" } }),
  },
});
