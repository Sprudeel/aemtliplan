<script setup lang="ts">
import type { RotationDto } from "~~/shared/types/api";

const { t } = useI18n();
useSeoMeta({ title: () => t("nav.history") });
const { isAdmin } = usePlan();
const api = usePlanApiBase();
const planId = usePlanId();
const requestFetch = useRequestFetch();
const { data: groups } = usePlanGroups();
const { data: jobs } = usePlanJobs();
const { data: rotations, status } = useAsyncData(
  () => `plan:${planId.value}:rotations`,
  () => requestFetch<RotationDto[]>(`${api.value}/rotations?limit=100`),
  { default: () => [] },
);
const { busy, undo } = useRotationActions();

const groupsById = computed(() => new Map(groups.value.map((group) => [group.id, group])));
const jobsById = computed(() => new Map(jobs.value.map((job) => [job.id, job])));
// Deleted groups/jobs still appear in old entries.
const groupOf = (id: number | null) => (id === null ? null : (groupsById.value.get(id) ?? { name: `#${id}`, color: "#9E9E9E" }));

const latestId = computed(() => rotations.value[0]?.id);
const canUndo = (rotation: RotationDto) =>
  isAdmin.value && rotation.id === latestId.value && rotation.trigger !== "undo" && !rotation.undoneAt;
</script>

<template>
  <UDashboardPanel id="history">
    <template #header>
      <UDashboardNavbar :title="t('nav.history')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UEmpty
        v-if="status !== 'pending' && rotations.length === 0"
        icon="i-lucide-history"
        :title="t('history.emptyTitle')"
        :description="t('history.emptyText')"
      />

      <ul v-else class="space-y-3" data-testid="history-list">
        <li v-for="rotation in rotations" :key="rotation.id">
          <UCollapsible class="rounded-lg border border-default">
            <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <RotationSummary :rotation="rotation" />
              <div class="flex items-center gap-1">
                <UButton
                  v-if="canUndo(rotation)"
                  :label="t('rotation.undo')"
                  icon="i-lucide-undo-2"
                  size="sm"
                  color="neutral"
                  variant="subtle"
                  :loading="busy"
                  data-testid="undo-rotation"
                  @click.stop="undo(rotation.id)"
                />
                <UButton :label="t('history.details')" trailing-icon="i-lucide-chevron-down" size="sm" color="neutral" variant="ghost" />
              </div>
            </div>
            <template #content>
              <ul class="divide-y divide-default border-t border-default">
                <li
                  v-for="(slot, i) in rotation.after"
                  :key="slot.jobId"
                  class="flex flex-wrap items-center gap-3 px-4 py-2 text-sm"
                >
                  <span class="min-w-32 flex-1">{{ jobsById.get(slot.jobId)?.name ?? `#${slot.jobId}` }}</span>
                  <GroupChip :group="groupOf(rotation.before[i]?.groupId ?? null)" size="sm" />
                  <UIcon name="i-lucide-arrow-right" class="size-4 text-dimmed" />
                  <GroupChip :group="groupOf(slot.groupId)" size="sm" />
                </li>
              </ul>
            </template>
          </UCollapsible>
        </li>
      </ul>
    </template>
  </UDashboardPanel>
</template>
