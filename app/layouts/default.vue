<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { t } = useI18n();
const route = useRoute();
const open = ref(false);
const planId = usePlanId();
const hasPlan = computed(() => Boolean(route.params.planId));
const { isAdmin } = usePlan();

const close = () => {
  open.value = false;
};

const links = computed<NavigationMenuItem[][]>(() => {
  if (!hasPlan.value) {
    return [[{ label: t("nav.plans"), icon: "i-lucide-layout-grid", to: "/plans", onSelect: close }]];
  }
  const base = `/plans/${planId.value}`;
  const main: NavigationMenuItem[] = [
    { label: t("nav.dashboard"), icon: "i-lucide-house", to: base, exact: true, onSelect: close },
    { label: t("nav.planner"), icon: "i-lucide-calendar-sync", to: `${base}/planner`, onSelect: close },
    { label: t("nav.jobs"), icon: "i-lucide-list-checks", to: `${base}/jobs`, onSelect: close },
    { label: t("nav.groups"), icon: "i-lucide-users", to: `${base}/groups`, onSelect: close },
    { label: t("nav.history"), icon: "i-lucide-history", to: `${base}/history`, onSelect: close },
  ];
  if (isAdmin.value) {
    main.push({
      label: t("nav.settings"),
      icon: "i-lucide-settings",
      to: `${base}/settings`,
      type: "trigger",
      defaultOpen: route.path.startsWith(`${base}/settings`),
      children: [
        { label: t("nav.settingsGeneral"), to: `${base}/settings`, exact: true, onSelect: close },
        { label: t("nav.settingsPublic"), to: `${base}/settings/public`, onSelect: close },
        { label: t("nav.wallDesigner"), to: `${base}/wall`, onSelect: close },
        { label: t("nav.settingsAccess"), to: `${base}/settings/access`, onSelect: close },
      ],
    });
  }
  return [main, [{ label: t("nav.allPlans"), icon: "i-lucide-layout-grid", to: "/plans", exact: true, onSelect: close }]];
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <PlanMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
          data-testid="main-nav"
        />
        <UNavigationMenu
          v-if="links[1]"
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex w-full items-center gap-1" :class="collapsed ? 'flex-col' : ''">
          <UserMenu :collapsed="collapsed" class="min-w-0 flex-1" />
          <UColorModeButton data-testid="color-mode" />
        </div>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
