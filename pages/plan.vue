<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue"
import { useSnackbar } from "~/composables/useSnackbar"
import PlanGroupsPanel from "~/components/plan/GroupsPanel.vue"
import PlanRotationBoard from "~/components/plan/RotationBoard.vue"
import type { GroupRecord } from "~/types/groups"
import type { JobRecord } from "~/types/jobs"

interface MatchingRecord {
  id: number
  jobId: number
  groupId: number
  job: JobRecord
  group: GroupRecord
}

definePageMeta({ layout: "app-shell", middleware: "auth" })

const { open: openSnackbar } = useSnackbar()
const dragState = ref<
  null | { type: "group"; groupId: number } | { type: "job"; jobId: number }
>(null)
const jobHoverId = ref<number | null>(null)
const rotationHoverIndex = ref<number | null>(null)
const rotationSaving = ref(false)

const {
  data: groupsRaw,
  status: groupsStatus,
  error: groupsError,
  refresh: refreshGroups,
} = await useFetch<GroupRecord[]>("/api/groups/groups", {
  default: () => [],
})

const {
  data: jobsRaw,
  status: jobsStatus,
  error: jobsError,
  refresh: refreshJobs,
} = await useFetch<JobRecord[]>("/api/jobs/jobs", {
  default: () => [],
})

const {
  data: matchingsRaw,
  status: matchingsStatus,
  error: matchingsError,
  refresh: refreshMatchings,
} = await useFetch<MatchingRecord[]>("/api/matchings/matchings", {
  default: () => [],
})

const groupList = computed(() => {
  const list = Array.isArray(groupsRaw.value) ? groupsRaw.value : []
  return list
    .filter((group) => group.inRotation)
    .sort((a, b) => a.rotationIndex - b.rotationIndex)
})

const inactiveGroupCount = computed(() => {
  const list = Array.isArray(groupsRaw.value) ? groupsRaw.value : []
  return list.filter((group) => !group.inRotation).length
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

const assignedGroupIdSet = computed(
  () => new Set(Array.from(assignmentMap.value.values()).map((g) => g.id)),
)
const assignedGroupIds = computed(() => Array.from(assignedGroupIdSet.value))

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

const unassignedGroups = computed(() =>
  groupList.value.filter((g) => !assignedGroupIdSet.value.has(g.id)),
)

const rotationOrder = ref<number[]>([])

const draggedGroupId = computed(() =>
  dragState.value?.type === "group" ? dragState.value.groupId : null,
)

watch(
  () =>
    jobList.value.map((job) => ({
      id: job.id,
      pointer: job.rotationPointer ?? 0,
    })),
  (list) => {
    const sorted = [...list].sort((a, b) => a.pointer - b.pointer)
    rotationOrder.value = sorted.map((item) => item.id)
  },
  { immediate: true, deep: true },
)

const assignMenu = reactive<{
  open: boolean
  jobId: number | null
  activator: HTMLElement | null
}>({ open: false, jobId: null, activator: null })

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
    .filter((card): card is { job: JobRecord; group: GroupRecord | null } =>
      Boolean(card),
    ),
)

const isLoading = computed(
  () =>
    groupsStatus.value === "pending" ||
    jobsStatus.value === "pending" ||
    matchingsStatus.value === "pending",
)

async function refreshAll() {
  await Promise.all([refreshGroups(), refreshJobs(), refreshMatchings()])
}

function startGroupDrag(event: DragEvent, groupId: number) {
  dragState.value = { type: "group", groupId }
  event.dataTransfer?.setData("text/plain", `group:${groupId}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
}

function startJobDrag(event: DragEvent, jobId: number) {
  dragState.value = { type: "job", jobId }
  event.dataTransfer?.setData("text/plain", `job:${jobId}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
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
    await $fetch("/api/matchings/matching", {
      method: "POST",
      body: { jobId, groupId },
    })
    await refreshAll()
    openSnackbar("Gruppe zugewiesen.")
    return true
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage || "Gruppe konnte nicht zugewiesen werden.",
      "error",
    )
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
    openSnackbar("Für dieses Ämtli ist keine Gruppe zugewiesen.", "error")
    return
  }
  try {
    await $fetch("/api/matchings/matching", {
      method: "DELETE",
      body: { jobId },
    })
    await refreshAll()
    openSnackbar("Zuweisung entfernt.")
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage || "Zuweisung konnte nicht entfernt werden.",
      "error",
    )
  }
}

async function persistRotation(order: number[]) {
  try {
    rotationSaving.value = true
    await $fetch("/api/jobs/rotationorder", {
      method: "POST",
      body: { order },
    })
    await refreshAll()
    openSnackbar("Rotation aktualisiert.")
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage ||
        "Rotation konnte nicht aktualisiert werden.",
      "error",
    )
  } finally {
    rotationSaving.value = false
  }
}

function handleSlotDragOver(index: number, jobId?: number) {
  const payload = dragState.value
  if (!payload) return
  if (payload.type === "group") {
    if (typeof jobId === "number") {
      jobHoverId.value = jobId
    }
  } else if (payload.type === "job") {
    rotationHoverIndex.value = index
  }
}

function handleSlotDragLeave(index: number, jobId?: number) {
  if (typeof jobId === "number" && jobHoverId.value === jobId)
    jobHoverId.value = null
  if (rotationHoverIndex.value === index) rotationHoverIndex.value = null
}

async function handleSlotDrop(index: number, jobId: number) {
  const payload = dragState.value
  if (!payload) return

  if (payload.type === "group") {
    try {
      await assignGroupToJob(jobId, payload.groupId)
    } finally {
      clearDragState()
    }
    return
  }

  if (payload.type === "job") {
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
  if (!payload || payload.type !== "job") {
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
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= rotationOrder.value.length ||
    to >= rotationOrder.value.length
  ) {
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
      <v-row class="gy-6">
        <v-col cols="12" lg="4" xl="3">
          <div class="plan-sidebar">
            <PlanGroupsPanel
              :groups="groupList"
              :assigned-group-ids="assignedGroupIds"
              :unassigned-count="unassignedGroups.length"
              :inactive-count="inactiveGroupCount"
              :is-loading="isLoading"
              :error="groupsError"
              :dragged-group-id="draggedGroupId"
              @start-group-drag="
                (groupId, event) => startGroupDrag(event, groupId)
              "
              @end-drag="clearDragState"
            />
          </div>
        </v-col>

        <v-col cols="12" lg="8" xl="9">
          <PlanRotationBoard
            :items="rotationItems"
            :is-loading="isLoading"
            :jobs-error="jobsError"
            :matchings-error="matchingsError"
            :job-hover-id="jobHoverId"
            :rotation-hover-index="rotationHoverIndex"
            :rotation-saving="rotationSaving"
            @move-item="moveRotationItem"
            @start-job-drag="(jobId, event) => startJobDrag(event, jobId)"
            @drag-end="clearDragState"
            @slot-drag-over="handleSlotDragOver"
            @slot-drag-leave="handleSlotDragLeave"
            @slot-drop="handleSlotDrop"
            @append-drop="handleAppendDrop"
            @clear-assignment="clearAssignment"
            @open-menu="openAssignMenu"
          />
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
                <span class="assign-menu__initial">{{
                  group.name?.slice(0, 1) ?? "?"
                }}</span>
              </v-avatar>
            </template>
            <v-list-item-title>{{ group.name }}</v-list-item-title>
            <v-list-item-subtitle
              >{{ group.members.length }} Mitglieder</v-list-item-subtitle
            >
          </v-list-item>
        </v-list>
      </v-sheet>
    </v-menu>
  </div>
</template>

<style scoped>
.plan-page {
  padding: 2px 0 48px;
}

.plan-wrapper {
  width: 100%;
  margin: 0 auto;
  padding: 0 16px 32px;
}

.plan-sidebar {
  position: relative;
}

@media (min-width: 1200px) {
  .plan-sidebar {
    position: sticky;
    top: 88px;
  }
}

.assign-menu__initial {
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
