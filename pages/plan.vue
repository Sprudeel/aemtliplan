<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

interface GroupMember {
  id?: number
  name: string
}

interface GroupRecord {
  id: number
  name: string
  color: string
  rotationIndex: number
  members: GroupMember[]
}

interface JobRecord {
  id: number
  name: string
  icon: string | null
  description: string | null
  rotationPointer: number
}

interface MatchingRecord {
  id: number
  jobId: number
  groupId: number
  job: JobRecord
  group: GroupRecord
}

definePageMeta({ layout: 'app-shell' })

const snackbar = reactive({ show: false, color: 'success', message: '' })
const dragState = ref<null | { type: 'group'; groupId: number } | { type: 'job'; jobId: number }>(null)
const jobHoverId = ref<number | null>(null)
const rotationHoverIndex = ref<number | null>(null)
const rotationSaving = ref(false)

const {
  data: groupsRaw,
  status: groupsStatus,
  error: groupsError,
  refresh: refreshGroups,
} = await useFetch<GroupRecord[]>('/api/groups/groups', {
  default: () => [],
})

const {
  data: jobsRaw,
  status: jobsStatus,
  error: jobsError,
  refresh: refreshJobs,
} = await useFetch<JobRecord[]>('/api/jobs/jobs', {
  default: () => [],
})

const {
  data: matchingsRaw,
  status: matchingsStatus,
  error: matchingsError,
  refresh: refreshMatchings,
} = await useFetch<MatchingRecord[]>('/api/matchings/matchings', {
  default: () => [],
})

const groupList = computed(() => {
  const list = Array.isArray(groupsRaw.value) ? groupsRaw.value : []
  return [...list].sort((a, b) => a.rotationIndex - b.rotationIndex)
})

const jobList = computed(() => {
  const list = Array.isArray(jobsRaw.value) ? jobsRaw.value : []
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
})

const assignmentMap = computed(() => {
  const map = new Map<number, GroupRecord>()
  const list = Array.isArray(matchingsRaw.value) ? matchingsRaw.value : []
  list.forEach((m) => {
    if (m?.jobId && m?.group) {
      map.set(m.jobId, m.group)
    }
  })
  return map
})

const assignedGroupIds = computed(() => new Set(Array.from(assignmentMap.value.values()).map((g) => g.id)))

const jobCards = computed(() =>
  jobList.value.map((job) => ({
    job,
    group: assignmentMap.value.get(job.id) ?? null,
  })),
)

const jobCardMap = computed(() => {
  const map = new Map<number, { job: JobRecord; group: GroupRecord | null }>()
  jobCards.value.forEach((card) => {
    map.set(card.job.id, card)
  })
  return map
})

const unassignedGroups = computed(() => groupList.value.filter((g) => !assignedGroupIds.value.has(g.id)))

const rotationOrder = ref<number[]>([])

watch(
  () => jobList.value.map((job) => ({ id: job.id, pointer: job.rotationPointer ?? 0 })),
  (list) => {
    const sorted = [...list].sort((a, b) => a.pointer - b.pointer)
    rotationOrder.value = sorted.map((item) => item.id)
  },
  { immediate: true, deep: true },
)

const assignMenu = reactive<{ open: boolean; jobId: number | null; activator: HTMLElement | null }>(
  { open: false, jobId: null, activator: null },
)

watch(
  () => assignMenu.open,
  (open) => {
    if (!open) {
      assignMenu.jobId = null
      assignMenu.activator = null
    }
  },
)

const rotationItems = computed(() =>
  rotationOrder.value
    .map((id) => jobCardMap.value.get(id))
    .filter((card): card is { job: JobRecord; group: GroupRecord | null } => Boolean(card)),
)

const isLoading = computed(
  () => groupsStatus.value === 'pending' || jobsStatus.value === 'pending' || matchingsStatus.value === 'pending',
)

function showSnackbar(message: string, color: 'success' | 'error' = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

async function refreshAll() {
  await Promise.all([refreshGroups(), refreshJobs(), refreshMatchings()])
}

function startGroupDrag(event: DragEvent, groupId: number) {
  dragState.value = { type: 'group', groupId }
  event.dataTransfer?.setData('text/plain', `group:${groupId}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function startJobDrag(event: DragEvent, jobId: number) {
  dragState.value = { type: 'job', jobId }
  event.dataTransfer?.setData('text/plain', `job:${jobId}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function clearDragState() {
  dragState.value = null
  jobHoverId.value = null
  rotationHoverIndex.value = null
}

function openAssignMenu(jobId: number, event: Event) {
  assignMenu.jobId = jobId
  assignMenu.activator = event.currentTarget as HTMLElement
  assignMenu.open = true
}

function closeAssignMenu() {
  assignMenu.open = false
}

async function assignGroupToJob(jobId: number, groupId: number) {
  const current = assignmentMap.value.get(jobId)
  if (current?.id === groupId) return true
  try {
    await $fetch('/api/matchings/matching', {
      method: 'POST',
      body: { jobId, groupId },
    })
    await refreshAll()
    showSnackbar('Gruppe zugewiesen.')
    return true
  } catch (error: any) {
    showSnackbar(error?.data?.statusMessage || 'Gruppe konnte nicht zugewiesen werden.', 'error')
    return false
  }
}

async function selectGroupFromMenu(groupId: number) {
  if (assignMenu.jobId == null) return
  const ok = await assignGroupToJob(assignMenu.jobId, groupId)
  if (ok) closeAssignMenu()
}

async function clearAssignment(jobId: number) {
  const current = assignmentMap.value.get(jobId)
  if (!current) {
    showSnackbar('Für dieses Ämtli ist keine Gruppe zugewiesen.', 'error')
    return
  }
  try {
    await $fetch('/api/matchings/matching', {
      method: 'DELETE',
      body: { jobId },
    })
    await refreshAll()
    showSnackbar('Zuweisung entfernt.')
  } catch (error: any) {
    showSnackbar(error?.data?.statusMessage || 'Zuweisung konnte nicht entfernt werden.', 'error')
  }
}

async function persistRotation(order: number[]) {
  try {
    rotationSaving.value = true
    await $fetch('/api/jobs/rotationorder', {
      method: 'POST',
      body: { order },
    })
    await refreshAll()
    showSnackbar('Rotation aktualisiert.')
  } catch (error: any) {
    showSnackbar(error?.data?.statusMessage || 'Rotation konnte nicht aktualisiert werden.', 'error')
  } finally {
    rotationSaving.value = false
  }
}

function handleSlotDragOver(index: number, jobId?: number) {
  const payload = dragState.value
  if (!payload) return
  if (payload.type === 'group') {
    if (typeof jobId === 'number') {
      jobHoverId.value = jobId
    }
  } else if (payload.type === 'job') {
    rotationHoverIndex.value = index
  }
}

function handleSlotDragLeave(index: number, jobId?: number) {
  if (typeof jobId === 'number' && jobHoverId.value === jobId) jobHoverId.value = null
  if (rotationHoverIndex.value === index) rotationHoverIndex.value = null
}

async function handleSlotDrop(index: number, jobId: number) {
  const payload = dragState.value
  if (!payload) return

  if (payload.type === 'group') {
    try {
      await assignGroupToJob(jobId, payload.groupId)
    } finally {
      clearDragState()
    }
    return
  }

  if (payload.type === 'job') {
    const order = [...rotationOrder.value]
    const existingIndex = order.indexOf(payload.jobId)
    if (existingIndex !== -1) {
      order.splice(existingIndex, 1)
    }
    const targetIndex = Math.min(Math.max(index, 0), order.length)
    order.splice(targetIndex, 0, payload.jobId)
    rotationOrder.value = order

    try {
      await persistRotation(order)
    } finally {
      clearDragState()
    }
  }
}

async function handleAppendDrop(index: number) {
  const payload = dragState.value
  if (!payload || payload.type !== 'job') {
    clearDragState()
    return
  }

  const order = [...rotationOrder.value]
  const existingIndex = order.indexOf(payload.jobId)
  if (existingIndex !== -1) {
    order.splice(existingIndex, 1)
  }
  const targetIndex = Math.min(Math.max(index, 0), order.length)
  order.splice(targetIndex, 0, payload.jobId)
  rotationOrder.value = order

  try {
    await persistRotation(order)
  } finally {
    clearDragState()
  }
}

async function moveRotationItem(from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= rotationOrder.value.length || to >= rotationOrder.value.length) {
    return
  }
  const order = [...rotationOrder.value]
  const [moved] = order.splice(from, 1)
  order.splice(to, 0, moved)
  rotationOrder.value = order
  await persistRotation(order)
}

</script>

<template>
  <div class="plan-page">
    <div class="plan-wrapper">
      <v-row class="plan-layout">
        <v-col cols="12" lg="4" xl="3" class="plan-sidebar">
          <v-card class="pa-5 plan-sidebar-card" elevation="2">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <h2 class="text-h6 font-weight-medium mb-1">Gruppen</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">Ziehe Gruppen auf Ämtli, um sie zuzuweisen.</p>
            </div>
            <v-chip variant="tonal" size="small">{{ groupList.length }} Gruppen</v-chip>
          </div>
          <v-divider />
          <div class="groups-container mt-4">
            <template v-if="isLoading">
              <v-skeleton-loader type="list-item@6" />
            </template>
            <template v-else-if="groupsError">
              <v-alert type="error" variant="tonal">
                {{ groupsError?.message || 'Gruppen konnten nicht geladen werden.' }}
              </v-alert>
            </template>
            <template v-else-if="!groupList.length">
              <v-alert type="info" variant="tonal">
                Noch keine Gruppen vorhanden. Lege Gruppen an, um sie zuzuweisen.
              </v-alert>
            </template>
            <template v-else>
              <div class="group-grid">
                <div
                  v-for="group in groupList"
                  :key="group.id"
                  class="group-card"
                  :class="{
                    'group-card--assigned': assignedGroupIds.has(group.id),
                    'group-card--drag-source': dragState?.type === 'group' && dragState.groupId === group.id,
                  }"
                  draggable="true"
                  @dragstart="startGroupDrag($event, group.id)"
                  @dragend="clearDragState"
                >
                  <div class="group-card__color" :style="{ backgroundColor: group.color }" />
                  <div class="group-card__body">
                    <div class="group-card__title">{{ group.name }}</div>
                    <div class="group-card__members">{{ group.members.length }} Mitglieder</div>
                  </div>
                  <v-icon
                    v-if="assignedGroupIds.has(group.id)"
                    icon="mdi-link-variant"
                    size="18"
                    class="group-card__status"
                  />
                </div>
              </div>
              <div v-if="unassignedGroups.length" class="text-caption text-medium-emphasis mt-3">
                {{ unassignedGroups.length }} Gruppen sind noch nicht zugewiesen.
              </div>
            </template>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" lg="8" xl="9" class="plan-content">
        <v-card class="pa-5 plan-main-card" elevation="2">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <h2 class="text-h6 font-weight-medium mb-1">Ämtli & Rotation</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">Ziehe Gruppen auf Ämtli und ordne die Reihenfolge direkt hier.</p>
            </div>
            <v-chip variant="tonal" size="small" prepend-icon="mdi-clipboard-check">
              {{ rotationItems.length }} Ämtli
            </v-chip>
          </div>
          <v-divider />
          <div class="jobs-container mt-4">
            <template v-if="isLoading">
              <v-skeleton-loader type="list-item-avatar-three-line@4" />
            </template>
            <template v-else-if="jobsError">
              <v-alert type="error" variant="tonal">
                {{ jobsError?.message || 'Ämtli konnten nicht geladen werden.' }}
              </v-alert>
            </template>
            <template v-else-if="matchingsError">
              <v-alert type="error" variant="tonal">
                {{ matchingsError?.message || 'Rotation konnte nicht geladen werden.' }}
              </v-alert>
            </template>
            <template v-else-if="!rotationItems.length">
              <v-alert type="info" variant="tonal">
                Noch keine Ämtli vorhanden. Lege zuerst Ämtli an.
              </v-alert>
            </template>
            <template v-else>
              <div class="rotation-grid" :class="{ 'rotation-grid--saving': rotationSaving }">
                <div
                  v-for="(item, index) in rotationItems"
                  :key="item.job.id"
                  class="rotation-slot"
                  :class="{
                    'rotation-slot--hover': rotationHoverIndex === index,
                  }"
                >
                  <div class="rotation-slot__header">
                    <span class="rotation-slot__label">Platz {{ index + 1 }}</span>
                    <div class="rotation-slot__actions">
                      <v-btn
                        size="x-small"
                        variant="text"
                        icon="mdi-chevron-up"
                        :disabled="index === 0"
                        @click.stop="moveRotationItem(index, index - 1)"
                      />
                      <v-btn
                        size="x-small"
                        variant="text"
                        icon="mdi-chevron-down"
                        :disabled="index === rotationItems.length - 1"
                        @click.stop="moveRotationItem(index, index + 1)"
                      />
                    </div>
                  </div>
                  <div
                    class="rotation-slot__body"
                    :class="{ 'rotation-slot__body--group-hover': jobHoverId === item.job.id }"
                    @dragover.prevent="handleSlotDragOver(index, item.job.id)"
                    @dragleave="handleSlotDragLeave(index, item.job.id)"
                    @drop.prevent="handleSlotDrop(index, item.job.id)"
                  >
                    <div
                      class="rotation-job"
                      draggable="true"
                      @dragstart="startJobDrag($event, item.job.id)"
                      @dragend="clearDragState"
                    >
                      <div class="job-card__header">
                        <div class="job-card__icon">
                          <template v-if="item.job.icon?.startsWith('mdi-')">
                            <v-icon :icon="item.job.icon" size="26" />
                          </template>
                          <template v-else-if="item.job.icon">
                            <span class="job-card__emoji">{{ item.job.icon }}</span>
                          </template>
                          <template v-else>
                            <v-icon icon="mdi-clipboard-outline" size="26" />
                          </template>
                        </div>
                        <div class="job-card__meta">
                          <div class="job-card__title">{{ item.job.name }}</div>
                          <div class="job-card__description text-medium-emphasis">
                            {{ item.job.description || 'Keine Beschreibung hinterlegt.' }}
                          </div>
                        </div>
                        <v-chip size="small" variant="tonal" class="ms-auto" prepend-icon="mdi-sync">
                          Slot {{ index + 1 }}
                        </v-chip>
                      </div>
                      <v-divider class="my-3" />
                      <div class="job-card__assignment">
                        <template v-if="item.group">
                          <div class="job-card__group" :style="{ borderColor: item.group.color }">
                            <div class="job-card__group-color" :style="{ backgroundColor: item.group.color }" />
                            <div>
                              <div class="font-weight-medium">{{ item.group.name }}</div>
                              <div class="text-caption text-medium-emphasis">
                                {{ item.group.members.length }} Mitglieder im Team
                              </div>
                            </div>
                          </div>
                          <div class="d-flex justify-end mt-3">
                            <v-btn
                              size="small"
                              variant="text"
                              color="error"
                              prepend-icon="mdi-link-off"
                              @click="clearAssignment(item.job.id)"
                            >
                              Zuweisung lösen
                            </v-btn>
                          </div>
                        </template>
                        <template v-else>
                          <div
                            class="job-card__empty text-medium-emphasis"
                            role="button"
                            tabindex="0"
                            aria-label="Gruppe auswählen"
                            @click="openAssignMenu(item.job.id, $event)"
                            @keydown.enter.prevent="openAssignMenu(item.job.id, $event)"
                            @keydown.space.prevent="openAssignMenu(item.job.id, $event)"
                          >
                            <span>Ziehe eine Gruppe hierher, um sie zuzuweisen.</span>
                            <v-icon icon="mdi-menu-down" size="18" class="text-medium-emphasis" />
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="rotation-slot rotation-slot--append"
                  :class="{ 'rotation-slot--hover': rotationHoverIndex === rotationItems.length }"
                >
                  <div class="rotation-slot__header">
                    <span class="rotation-slot__label">Am Ende</span>
                  </div>
                  <div
                    class="rotation-slot__body rotation-slot__body--empty"
                    @dragover.prevent="handleSlotDragOver(rotationItems.length)"
                    @dragleave="handleSlotDragLeave(rotationItems.length)"
                    @drop.prevent="handleAppendDrop(rotationItems.length)"
                  >
                    <v-icon icon="mdi-plus" class="text-medium-emphasis" />
                    <span class="text-caption">Hierhin ziehen, um ans Ende zu setzen</span>
                  </div>
                </div>
              </div>
              <div v-if="rotationSaving" class="rotation-saving mt-2">
                <v-progress-linear indeterminate color="primary" rounded height="4" />
              </div>
            </template>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>

    <v-menu
      v-model="assignMenu.open"
      :activator="assignMenu.activator"
      location="bottom start"
      offset="6"
      transition="scale-transition"
    >
      <v-sheet class="assign-menu" elevation="2" rounded="lg">
        <v-list density="compact" nav>
          <v-list-subheader>Gruppe auswählen</v-list-subheader>
          <v-list-item
            v-for="group in groupList"
            :key="group.id"
            @click="selectGroupFromMenu(group.id)"
          >
            <template #prepend>
              <v-avatar size="24" :style="{ backgroundColor: group.color }">
                <span class="assign-menu__initial">{{ group.name?.slice(0, 1) ?? '?' }}</span>
              </v-avatar>
            </template>
            <v-list-item-title>{{ group.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ group.members.length }} Mitglieder</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-sheet>
    </v-menu>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3500"
      location="bottom right"
      elevation="2"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn color="white" variant="text" @click="snackbar.show = false">Schliessen</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.plan-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.plan-wrapper {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 16px 32px;
}

.plan-layout {
  row-gap: 24px;
  column-gap: 24px;
}

.plan-sidebar {
  display: flex;
}

.plan-sidebar-card {
  width: 100%;
}

@media (min-width: 1200px) {
  .plan-sidebar-card {
    position: sticky;
    top: 88px;
  }

  .groups-container {
    max-height: calc(100vh - 160px);
    overflow-y: auto;
    padding-right: 4px;
    scrollbar-gutter: stable both-edges;
  }
}

.plan-content {
  display: flex;
}

.plan-main-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  width: 100%;
}

.groups-container,
.jobs-container,
.rotation-container {
  min-height: 160px;
}

.group-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.group-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  align-items: center;
  background: white;
  cursor: grab;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.group-card:active {
  cursor: grabbing;
}

.group-card--drag-source {
  opacity: 0.5;
}

.group-card:hover {
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1);
  transform: translateY(-2px);
}

.group-card--assigned {
  border-color: rgba(33, 150, 243, 0.45);
}

.group-card__color {
  width: 12px;
  height: 100%;
  border-radius: 8px;
}

.group-card__body {
  flex: 1;
}

.group-card__title {
  font-weight: 600;
}

.group-card__members {
  font-size: 0.82rem;
  color: rgba(0, 0, 0, 0.54);
}

.group-card__status {
  color: rgba(33, 150, 243, 0.85);
}

.job-card {
  padding: 14px;
  border-radius: 16px;
  cursor: grab;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.job-card:active {
  cursor: grabbing;
}

.job-card--hover {
  border-color: rgba(33, 150, 243, 0.6);
  box-shadow: 0 6px 18px rgba(33, 150, 243, 0.12);
}

.job-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.job-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(33, 150, 243, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.job-card__emoji {
  font-size: 28px;
}

.job-card__meta {
  flex: 1;
  min-width: 0;
}

.job-card__title {
  font-weight: 600;
  font-size: 1rem;
}

.job-card__description {
  font-size: 0.85rem;
  margin-top: 2px;
}

.job-card__assignment {
  min-height: 88px;
}

.job-card__group {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
  background: rgba(255, 255, 255, 0.8);
}

.job-card__group-color {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.job-card__empty {
  border: 1px dashed rgba(33, 150, 243, 0.4);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.job-card__empty:hover,
.job-card__empty:focus-visible {
  background: rgba(33, 150, 243, 0.08);
  border-color: rgba(33, 150, 243, 0.6);
}


.rotation-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  margin-top: 8px;
  align-items: stretch;
}

.rotation-grid--saving {
  opacity: 0.85;
}

.rotation-slot {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: white;
  display: flex;
  flex-direction: column;
  min-height: 140px;
  transition: box-shadow 0.2s ease;
}

.rotation-slot--hover {
  box-shadow: 0 6px 16px rgba(33, 150, 243, 0.12);
}

.rotation-slot__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 6px;
}

.rotation-slot__label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: rgba(33, 150, 243, 0.85);
}

.rotation-slot__actions {
  display: inline-flex;
  gap: 4px;
}

.rotation-slot__body {
  flex: 1;
  margin: 6px 14px 14px;
  border: 1px dashed rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.rotation-slot--hover .rotation-slot__body {
  border-color: rgba(33, 150, 243, 0.7);
  background: rgba(33, 150, 243, 0.12);
}

.rotation-slot__body--group-hover {
  border-color: rgba(33, 150, 243, 0.7);
  background: rgba(33, 150, 243, 0.08);
}

.rotation-slot__body--empty {
  flex-direction: column;
  gap: 6px;
  color: rgba(0, 0, 0, 0.54);
  text-align: center;
}

.assign-menu__initial {
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.75rem;
  font-weight: 600;
}


.rotation-job {
  width: 100%;
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.16), rgba(33, 150, 243, 0.1));
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: grab;
}

.rotation-job:active {
  cursor: grabbing;
}

.rotation-job__title {
  font-weight: 600;
  font-size: 0.95rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.rotation-job__meta {
  font-size: 0.82rem;
  color: rgba(0, 0, 0, 0.62);
}

.rotation-saving {
  width: 240px;
}

@media (max-width: 1264px) {
  .rotation-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

@media (max-width: 960px) {
  .group-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .rotation-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1400px) {
  .rotation-grid {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }
}

@media (min-width: 1800px) {
  .plan-wrapper {
    max-width: 1680px;
  }

  .rotation-grid {
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  }
}
</style>
