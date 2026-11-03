<script setup lang="ts">
const { t, d } = useI18n();
const { plan, isAdmin } = usePlan();
const planId = usePlanId();
const { busy, rotateNow } = useRotationActions();

// Re-render the countdown every 30 s.
const now = ref(new Date());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => (timer = setInterval(() => (now.value = new Date()), 30_000)));
onBeforeUnmount(() => clearInterval(timer));

const next = computed(() => (plan.value?.nextRotationAt ? new Date(plan.value.nextRotationAt) : null));
const parts = computed(() => (next.value ? countdownParts(next.value, now.value) : null));
const countdown = computed(() => {
  const p = parts.value;
  if (!p) return "";
  if (p.due) return t("dashboard.dueNow");
  const segments: string[] = [];
  if (p.days) segments.push(t("time.days", p.days));
  if (p.hours) segments.push(t("time.hours", p.hours));
  if (!p.days && (p.minutes || segments.length === 0)) segments.push(t("time.minutes", p.minutes));
  return t("dashboard.inTime", { time: segments.join(" ") });
});
</script>

<template>
  <UPageCard :title="t('dashboard.nextRotation')" icon="i-lucide-calendar-clock" variant="subtle" data-testid="next-rotation">
    <div v-if="next" class="space-y-1">
      <p class="text-lg font-semibold text-highlighted">{{ d(next, "long") }}</p>
      <p class="text-sm text-muted">{{ countdown }}</p>
    </div>
    <div v-else class="space-y-1">
      <p class="font-medium text-highlighted">{{ t("dashboard.autoOff") }}</p>
      <ULink v-if="isAdmin" :to="`/plans/${planId}/settings`" class="text-sm text-primary">{{ t("dashboard.setSchedule") }}</ULink>
    </div>

    <UButton
      v-if="isAdmin"
      :label="t('rotation.rotateNow')"
      icon="i-lucide-refresh-cw"
      :loading="busy"
      class="w-fit"
      data-testid="rotate-now"
      @click="rotateNow"
    />
  </UPageCard>
</template>
