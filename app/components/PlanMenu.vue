<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

defineProps<{ collapsed?: boolean }>();

const { t } = useI18n();
const { data: plans } = useMyPlans();
const planId = usePlanId();

const current = computed(() => plans.value.find((plan) => plan.id === planId.value));
const label = computed(() => current.value?.name ?? t("app.name"));

const items = computed<DropdownMenuItem[][]>(() => [
  plans.value.map((plan) => ({
    label: plan.name,
    icon: plan.id === planId.value ? "i-lucide-check" : "i-lucide-tent",
    to: `/plans/${plan.id}`,
  })),
  [
    { label: t("plans.create"), icon: "i-lucide-circle-plus", to: "/plans?create=1" },
    { label: t("nav.allPlans"), icon: "i-lucide-layout-grid", to: "/plans" },
  ],
]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :label="collapsed ? undefined : label"
      :avatar="{ src: '/logo2.png', alt: '' }"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated py-2"
      :ui="{ trailingIcon: 'text-dimmed' }"
      data-testid="plan-menu"
    />
  </UDropdownMenu>
</template>
