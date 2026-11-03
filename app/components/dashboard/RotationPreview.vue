<script setup lang="ts">
import type { JobDto, PreviewEntryDto } from "~~/shared/types/api";

const props = defineProps<{ preview: PreviewEntryDto[]; jobs: JobDto[] }>();
const { t } = useI18n();
const jobsById = computed(() => new Map(props.jobs.map((job) => [job.id, job])));
</script>

<template>
  <UPageCard :title="t('dashboard.preview')" :description="t('dashboard.previewText')" variant="subtle">
    <p v-if="preview.length === 0" class="text-sm text-muted">{{ t("dashboard.noJobs") }}</p>
    <ul v-else class="divide-y divide-default" data-testid="rotation-preview">
      <li v-for="entry in preview" :key="entry.jobId" class="flex flex-wrap items-center gap-3 py-2.5">
        <div class="flex items-center gap-2 min-w-40 flex-1">
          <JobIcon :icon="jobsById.get(entry.jobId)?.icon" size="sm" />
          <span class="font-medium text-highlighted">{{ jobsById.get(entry.jobId)?.name }}</span>
        </div>
        <div class="flex items-center gap-2">
          <GroupChip :group="entry.current" size="sm" />
          <UIcon name="i-lucide-arrow-right" class="size-4 text-dimmed" />
          <GroupChip :group="entry.next" size="sm" />
        </div>
      </li>
    </ul>
  </UPageCard>
</template>
