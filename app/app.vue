<script setup lang="ts">
import { de, fr, it } from "@nuxt/ui/locale";

const { locale, t } = useI18n();
const uiLocales = { de, fr, it } as const;
const uiLocale = computed(() => uiLocales[locale.value as keyof typeof uiLocales] ?? de);

const colorMode = useColorMode();
const themeColor = computed(() => (colorMode.value === "dark" ? "#18181b" : "#ffffff"));

useHead({
  htmlAttrs: { lang: computed(() => `${locale.value}-CH`) },
  meta: [
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { key: "theme-color", name: "theme-color", content: themeColor },
  ],
  link: [{ rel: "icon", href: "/favicon.ico" }],
  titleTemplate: (title) => (title ? `${title} · ${t("app.name")}` : t("app.name")),
});
</script>

<template>
  <UApp :locale="uiLocale" :toaster="{ position: 'bottom-right' }">
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
