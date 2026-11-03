<script setup lang="ts">
import type { MeDto, PreviewEntryDto, RotationDto } from "~~/shared/types/api";

const { t } = useI18n();
const { plan, isAdmin } = usePlan();
useSeoMeta({ title: () => plan.value?.name ?? t("nav.dashboard") });

const api = usePlanApiBase();
const planId = usePlanId();
const requestFetch = useRequestFetch();

const { data: assignments } = usePlanAssignments();
const { data: groups } = usePlanGroups();
const { data: jobs } = usePlanJobs();
const { data: preview } = useAsyncData(
  () => `plan:${planId.value}:preview`,
  () => requestFetch<PreviewEntryDto[]>(`${api.value}/rotations/preview`),
  { default: () => [] },
);
const { data: me } = useAsyncData(() => `plan:${planId.value}:me`, () => requestFetch<MeDto>(`${api.value}/me`));
const { data: latest } = useAsyncData(
  () => `plan:${planId.value}:rotations:latest`,
  () => requestFetch<RotationDto[]>(`${api.value}/rotations?limit=1`),
  { default: () => [] },
);
const { busy, undo } = useRotationActions();
const lastRotation = computed(() => latest.value[0]);
const canUndo = computed(() => isAdmin.value && lastRotation.value && lastRotation.value.trigger !== "undo" && !lastRotation.value.undoneAt);
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar :title="plan?.name ?? ''">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge :label="t(isAdmin ? 'roles.admin' : 'roles.viewer')" variant="subtle" color="neutral" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-4 lg:grid-cols-3">
        <DashboardNextRotationCard class="lg:col-span-1" />
        <UPageCard
          v-if="me?.group"
          :title="t('dashboard.myJobs')"
          icon="i-lucide-user-check"
          variant="subtle"
          class="lg:col-span-2"
          data-testid="my-jobs"
        >
          <div class="flex flex-wrap items-center gap-2">
            <GroupChip :group="me.group" />
            <template v-if="me.jobs.length">
              <span v-for="job in me.jobs" :key="job.id" class="inline-flex items-center gap-1.5 font-medium">
                <JobIcon :icon="job.icon" size="sm" />{{ job.name }}
              </span>
            </template>
            <span v-else class="text-muted">{{ t("dashboard.myJobsNone") }}</span>
          </div>
        </UPageCard>
        <UPageCard
          v-else-if="lastRotation"
          :title="t('dashboard.lastRotation')"
          icon="i-lucide-history"
          variant="subtle"
          class="lg:col-span-2"
        >
          <RotationSummary :rotation="lastRotation" />
          <UButton
            v-if="canUndo"
            :label="t('rotation.undo')"
            icon="i-lucide-undo-2"
            color="neutral"
            variant="subtle"
            class="w-fit"
            :loading="busy"
            data-testid="undo-last"
            @click="undo(lastRotation.id)"
          />
        </UPageCard>
      </div>

      <DashboardStatsGrid :assignments="assignments" :groups="groups" />
      <DashboardRotationPreview :preview="preview" :jobs="jobs" />
    </template>
  </UDashboardPanel>
</template>
