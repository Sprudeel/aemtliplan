<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

defineProps<{ collapsed?: boolean }>();

const { t, locale, locales, setLocale } = useI18n();
const colorMode = useColorMode();
const { user, signOut } = useAuthSession();

const items = computed<DropdownMenuItem[][]>(() => [
  [{ type: "label", label: user.value?.name ?? "", description: user.value?.email }],
  [{ label: t("nav.account"), icon: "i-lucide-user", to: "/account" }],
  [
    {
      label: t("user.language"),
      icon: "i-lucide-languages",
      children: locales.value.map((entry) => ({
        label: entry.name ?? entry.code,
        type: "checkbox" as const,
        checked: locale.value === entry.code,
        onSelect: () => setLocale(entry.code),
      })),
    },
    {
      label: t("user.appearance"),
      icon: "i-lucide-sun-moon",
      children: [
        { label: t("user.light"), icon: "i-lucide-sun", type: "checkbox" as const, checked: colorMode.preference === "light", onSelect: () => (colorMode.preference = "light") },
        { label: t("user.dark"), icon: "i-lucide-moon", type: "checkbox" as const, checked: colorMode.preference === "dark", onSelect: () => (colorMode.preference = "dark") },
        { label: t("user.system"), icon: "i-lucide-monitor", type: "checkbox" as const, checked: colorMode.preference === "system", onSelect: () => (colorMode.preference = "system") },
      ],
    },
  ],
  [{ label: t("user.signOut"), icon: "i-lucide-log-out", onSelect: () => signOut() }],
]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :label="collapsed ? undefined : user?.name"
      :avatar="{ alt: user?.name ?? '?' }"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{ trailingIcon: 'text-dimmed' }"
      data-testid="user-menu"
    />
  </UDropdownMenu>
</template>
