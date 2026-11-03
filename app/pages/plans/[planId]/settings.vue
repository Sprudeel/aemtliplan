<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { t } = useI18n();
const { isAdmin, plan } = usePlan();
const planId = usePlanId();

const links = computed<NavigationMenuItem[]>(() => [
  { label: t("nav.settingsGeneral"), icon: "i-lucide-sliders-horizontal", to: `/plans/${planId.value}/settings`, exact: true },
  { label: t("nav.settingsPublic"), icon: "i-lucide-monitor", to: `/plans/${planId.value}/settings/public` },
  { label: t("nav.settingsAccess"), icon: "i-lucide-shield", to: `/plans/${planId.value}/settings/access` },
]);
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="t('nav.settings')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar v-if="isAdmin">
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 w-full lg:max-w-2xl mx-auto">
        <UAlert
          v-if="plan && !isAdmin"
          icon="i-lucide-lock"
          color="neutral"
          variant="subtle"
          :title="t('settings.adminOnly')"
        />
        <NuxtPage v-else-if="plan" />
      </div>
    </template>
  </UDashboardPanel>
</template>
