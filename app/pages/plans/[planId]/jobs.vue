<script setup lang="ts">
import type { JobDto } from "~~/shared/types/api";

const { t } = useI18n();
useSeoMeta({ title: () => t("nav.jobs") });
const { isAdmin } = usePlan();
const api = usePlanApiBase();
const planId = usePlanId();
const notify = useNotify();
const { data: jobs, refresh, status } = usePlanJobs();

const search = ref("");
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return jobs.value;
  return jobs.value.filter((job) => `${job.name} ${job.description ?? ""}`.toLowerCase().includes(term));
});

const formOpen = ref(false);
const editing = ref<JobDto | null>(null);
function openCreate() {
  editing.value = null;
  formOpen.value = true;
}
function openEdit(job: JobDto) {
  editing.value = job;
  formOpen.value = true;
}

const deleteOpen = ref(false);
const deleting = ref<JobDto | null>(null);
const deleteBusy = ref(false);
function askDelete(job: JobDto) {
  deleting.value = job;
  deleteOpen.value = true;
}
async function confirmDelete() {
  if (!deleting.value) return;
  deleteBusy.value = true;
  const ok = await notify.run(() => plainFetch(`${api.value}/jobs/${deleting.value!.id}`, { method: "DELETE" }), "jobs.deleted");
  deleteBusy.value = false;
  if (ok) {
    deleteOpen.value = false;
    await refreshNuxtData();
  }
}
</script>

<template>
  <UDashboardPanel id="jobs">
    <template #header>
      <UDashboardNavbar :title="t('nav.jobs')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton v-if="isAdmin" :label="t('jobs.create')" icon="i-lucide-plus" data-testid="add-job" @click="openCreate" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <UInput v-model="search" icon="i-lucide-search" :placeholder="t('actions.search')" class="max-w-sm" />
        <ULink :to="`/plans/${planId}/planner`" class="text-sm text-primary">{{ t("jobs.orderHint") }}</ULink>
      </div>

      <UEmpty
        v-if="status !== 'pending' && jobs.length === 0"
        icon="i-lucide-list-checks"
        :title="t('jobs.emptyTitle')"
        :description="t('jobs.emptyText')"
      />

      <ul v-else class="divide-y divide-default rounded-lg border border-default" data-testid="job-list">
        <li v-for="job in filtered" :key="job.id" class="flex items-center gap-3 px-4 py-3">
          <span class="w-6 text-right text-sm text-dimmed tabular-nums">{{ job.position + 1 }}</span>
          <JobIcon :icon="job.icon" />
          <div class="min-w-0 flex-1">
            <p class="font-medium text-highlighted truncate">{{ job.name }}</p>
            <p v-if="job.description" class="text-sm text-muted truncate">{{ job.description }}</p>
          </div>
          <div v-if="isAdmin" class="flex gap-1">
            <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" :aria-label="t('actions.edit')" @click="openEdit(job)" />
            <UButton icon="i-lucide-trash" color="error" variant="ghost" :aria-label="t('actions.delete')" @click="askDelete(job)" />
          </div>
        </li>
      </ul>

      <JobsJobFormModal v-model:open="formOpen" :job="editing" @saved="refresh()" />
      <ConfirmModal
        v-model:open="deleteOpen"
        :title="t('jobs.deleteTitle')"
        :description="t('jobs.deleteText', { name: deleting?.name })"
        :loading="deleteBusy"
        @confirm="confirmDelete"
      />
    </template>
  </UDashboardPanel>
</template>
