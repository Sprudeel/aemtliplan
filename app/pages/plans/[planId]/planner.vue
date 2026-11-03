<script setup lang="ts">
import { VueDraggable, type DraggableEvent } from "vue-draggable-plus";
import type { GroupDto, JobDto } from "~~/shared/types/api";

const { t } = useI18n();
useSeoMeta({ title: () => t("nav.planner") });
const { isAdmin } = usePlan();
const api = usePlanApiBase();
const notify = useNotify();
const { data: groups } = usePlanGroups();
const { data: jobs } = usePlanJobs();
const { data: assignments } = usePlanAssignments();

const groupsInRotation = computed(() => groups.value.filter((group) => group.inRotation));
const groupByJob = computed(() => new Map(assignments.value.map((entry) => [entry.jobId, entry.group])));
const busyGroupIds = computed(() => new Set(assignments.value.map((entry) => entry.group?.id).filter(Boolean)));

// Local copy of the ring for drag & drop; reset whenever the server data changes.
const ring = ref<JobDto[]>([]);
watch(jobs, (value) => (ring.value = [...value]), { immediate: true });

// One (always empty) drop list per Ämtli; a dropped group lands here for a moment.
const drops = reactive<Record<number, GroupDto[]>>({});
watch(jobs, (value) => value.forEach((job) => (drops[job.id] = [])), { immediate: true });

const saving = ref(false);

async function saveOrder(order: JobDto[]) {
  const ids = order.map((job) => job.id);
  if (ids.join() === jobs.value.map((job) => job.id).join()) return;
  saving.value = true;
  const ok = await notify.run(() => plainFetch(`${api.value}/jobs/order`, { method: "PUT", body: { jobIds: ids } }), "planner.orderSaved");
  saving.value = false;
  if (!ok) ring.value = [...jobs.value];
  await refreshNuxtData();
}

function move(index: number, delta: number) {
  saveOrder(moveItem(ring.value, index, index + delta));
}

async function assign(jobId: number, groupId: number | null) {
  saving.value = true;
  const ok = await notify.run(() =>
    groupId === null
      ? plainFetch(`${api.value}/assignments/${jobId}`, { method: "DELETE" })
      : plainFetch(`${api.value}/assignments/${jobId}`, { method: "PUT", body: { groupId } }),
  );
  saving.value = false;
  if (ok) await refreshNuxtData();
}

function onDrop(jobId: number, event: DraggableEvent<GroupDto>) {
  drops[jobId] = [];
  if (event.data?.id) assign(jobId, event.data.id);
}

const groupItems = computed(() => [
  ...groupsInRotation.value.map((group) => ({ label: group.name, value: group.id })),
]);
</script>

<template>
  <UDashboardPanel id="planner">
    <template #header>
      <UDashboardNavbar :title="t('nav.planner')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UIcon v-if="saving" name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        v-if="!isAdmin"
        icon="i-lucide-eye"
        color="neutral"
        variant="subtle"
        :title="t('planner.readOnly')"
      />

      <!-- Drag & drop only works in the browser; rendering it on the server breaks hydration. -->
      <ClientOnly>
      <div class="grid items-start gap-6 lg:grid-cols-[18rem_1fr]">
        <!-- Group pool -->
        <UPageCard :title="t('planner.groups')" :description="isAdmin ? t('planner.groupsHint') : undefined" variant="subtle" class="lg:sticky lg:top-4">
          <VueDraggable
            :model-value="groupsInRotation"
            :group="{ name: 'groups', pull: 'clone', put: false }"
            :sort="false"
            :disabled="!isAdmin"
            :clone="(group: GroupDto) => ({ ...group })"
            draggable=".pool-item"
            class="flex flex-col gap-2"
            data-testid="group-pool"
          >
            <div
              v-for="group in groupsInRotation"
              :key="group.id"
              class="pool-item flex items-center justify-between gap-2 rounded-md border border-default px-2.5 py-2"
              :class="isAdmin ? 'cursor-grab active:cursor-grabbing' : ''"
              :data-group-id="group.id"
            >
              <GroupChip :group="group" size="sm" />
              <span class="text-xs" :class="busyGroupIds.has(group.id) ? 'text-muted' : 'text-secondary'">
                {{ busyGroupIds.has(group.id) ? t("planner.assigned") : t("planner.idle") }}
              </span>
            </div>
          </VueDraggable>
          <p v-if="groupsInRotation.length === 0" class="text-sm text-muted">{{ t("planner.noGroups") }}</p>
        </UPageCard>

        <!-- Ämtli ring -->
        <UPageCard :title="t('planner.ring')" :description="t('planner.ringHint')" variant="subtle">
          <p v-if="ring.length === 0" class="text-sm text-muted">{{ t("dashboard.noJobs") }}</p>
          <VueDraggable
            v-model="ring"
            handle=".drag-handle"
            draggable=".ring-item"
            :animation="150"
            :disabled="!isAdmin"
            class="flex flex-col gap-2"
            data-testid="ring"
            @end="saveOrder(ring)"
          >
            <div
              v-for="(job, index) in ring"
              :key="job.id"
              class="ring-item flex flex-wrap items-center gap-3 rounded-lg border border-default bg-default p-3"
              :data-job-id="job.id"
            >
              <UIcon v-if="isAdmin" name="i-lucide-grip-vertical" class="drag-handle size-5 cursor-grab text-dimmed" />
              <span class="w-6 text-sm text-dimmed tabular-nums">{{ index + 1 }}.</span>
              <JobIcon :icon="job.icon" size="sm" />
              <span class="min-w-32 flex-1 font-medium text-highlighted">{{ job.name }}</span>

              <!-- Drop zone + current group -->
              <VueDraggable
                :model-value="drops[job.id] ?? []"
                :group="{ name: 'groups', pull: false, put: isAdmin }"
                draggable=".dropped-item"
                class="flex min-h-9 min-w-40 items-center rounded-md border border-dashed border-default px-2"
                :data-testid="`drop-${job.id}`"
                @update:model-value="(value: GroupDto[]) => (drops[job.id] = value)"
                @add="(event: DraggableEvent<GroupDto>) => onDrop(job.id, event)"
              >
                <GroupChip :group="groupByJob.get(job.id) ?? null" size="sm" />
              </VueDraggable>

              <div v-if="isAdmin" class="flex items-center gap-1">
                <USelect
                  :model-value="groupByJob.get(job.id)?.id"
                  :items="groupItems"
                  :placeholder="t('planner.pickGroup')"
                  size="sm"
                  class="w-36"
                  :aria-label="t('planner.pickGroupFor', { job: job.name })"
                  @update:model-value="(value) => assign(job.id, Number(value))"
                />
                <UButton
                  v-if="groupByJob.get(job.id)"
                  icon="i-lucide-x"
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  :aria-label="t('planner.clear')"
                  @click="assign(job.id, null)"
                />
                <UButton
                  icon="i-lucide-arrow-up"
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  :disabled="index === 0"
                  :aria-label="t('planner.moveUp')"
                  @click="move(index, -1)"
                />
                <UButton
                  icon="i-lucide-arrow-down"
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  :disabled="index === ring.length - 1"
                  :aria-label="t('planner.moveDown')"
                  @click="move(index, 1)"
                />
              </div>
            </div>
          </VueDraggable>
        </UPageCard>
      </div>
        <template #fallback>
          <div class="grid gap-6 lg:grid-cols-[18rem_1fr]">
            <USkeleton class="h-64" />
            <USkeleton class="h-96" />
          </div>
        </template>
      </ClientOnly>
    </template>
  </UDashboardPanel>
</template>
