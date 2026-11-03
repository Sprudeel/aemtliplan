<script setup lang="ts">
const { locale, locales, setLocale } = useI18n();
const localeItems = computed(() =>
  locales.value.map((entry) => ({ label: entry.name ?? entry.code, value: entry.code })),
);
</script>

<template>
  <div class="min-h-svh flex flex-col items-center justify-center gap-6 bg-elevated/50 px-4 py-10">
    <NuxtLink to="/" class="flex items-center gap-2">
      <img src="/logo2.png" alt="" class="h-12 w-auto">
    </NuxtLink>
    <UPageCard class="w-full max-w-md" variant="subtle">
      <slot />
    </UPageCard>
    <div class="flex items-center gap-2">
    <UColorModeButton data-testid="color-mode" />
    <USelect
      :model-value="locale"
      :items="localeItems"
      variant="ghost"
      size="sm"
      icon="i-lucide-languages"
      data-testid="auth-locale"
      @update:model-value="(value) => setLocale(value as 'de' | 'fr' | 'it')"
    />
    </div>
  </div>
</template>
