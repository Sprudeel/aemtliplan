<script setup lang="ts">
import { computed } from "vue"
import DashboardNextRotationCard from "~/components/dashboard/NextRotationCard.vue"
import DashboardRotationSnapshotCard from "~/components/dashboard/RotationSnapshotCard.vue"
import DashboardRotationOverview from "~/components/dashboard/RotationOverview.vue"
import type { RotationItem, RotationPreviewResponse } from "~/types/dashboard"

definePageMeta({
  layout: "app-shell",
  middleware: "auth",
})

const { data: groupsRaw } = await useFetch("/api/groups/groups", {
  default: () => [],
})

const { data: jobsRaw } = await useFetch("/api/jobs/jobs", {
  default: () => [],
})

const {
  data: rotationPreview,
  status: rotationPreviewStatus,
  error: rotationPreviewError,
  refresh: refreshRotationPreview,
} = await useFetch<RotationPreviewResponse>(
  "/api/matchings/matchings-preview",
  {
    default: () => ({ step: 0, totalJobs: 0, jobs: [] }),
  },
)

const rotationGroups = computed(() => {
  const raw = groupsRaw.value
  if (!Array.isArray(raw)) return []
  return raw
    .filter((group: any) => group?.inRotation)
    .sort((a: any, b: any) => (a?.rotationIndex ?? 0) - (b?.rotationIndex ?? 0))
})

const previewJobs = computed(() =>
  Array.isArray(rotationPreview.value?.jobs) ? rotationPreview.value.jobs : [],
)

const rotationEntries = computed<RotationItem[]>(() =>
  previewJobs.value
    .map((entry, index) => {
      const job = entry.job
      const currentGroup = entry.currentGroup
      const nextGroup = entry.nextGroup
      const icon =
        typeof job?.icon === "string" && job.icon.length
          ? job.icon
          : "mdi-clipboard-text-outline"
      const iconType: "mdi" | "text" = icon.startsWith("mdi-") ? "mdi" : "text"
      return {
        id: job?.id ?? index,
        jobId: job?.id,
        jobName: job?.name ?? "Unbenanntes Ämtli",
        jobIcon: icon,
        iconType,
        jobDescription: job?.description ?? "",
        rotationPointer: job?.rotationPointer ?? index,
        groupName: currentGroup?.name ?? "—",
        groupColor: currentGroup?.color ?? "#B0BEC5",
        members: currentGroup?.members ?? [],
        nextGroupName: nextGroup?.name ?? "—",
        nextGroupColor: nextGroup?.color ?? "#B0BEC5",
        nextMembers: nextGroup?.members ?? [],
      }
    })
    .sort((a, b) => a.rotationPointer - b.rotationPointer),
)

const totalActiveJobs = computed(
  () => previewJobs.value.filter((entry) => entry.currentGroup).length,
)
const totalJobsCount = computed(
  () => rotationPreview.value?.totalJobs ?? jobsRaw.value.length,
)

const rotationSummary = computed(() => ({
  totalActiveJobs: totalActiveJobs.value,
  totalJobs: totalJobsCount.value,
  totalRotationGroups: rotationGroups.value.length,
  totalGroups: groupsRaw.value.length,
}))

const compactFormatter = new Intl.DateTimeFormat("de-CH", {
  dateStyle: "medium",
  timeStyle: "short",
})

const generatedAt = new Date()
const lastUpdatedLabel = compactFormatter.format(generatedAt)

async function handleRotationForced() {
  await refreshRotationPreview()
}
</script>

<template>
  <div class="dashboard-page">
    <v-row class="gy-6">
      <v-col cols="12" lg="4">
        <DashboardNextRotationCard @rotation-forced="handleRotationForced" />
      </v-col>
      <v-col cols="12" lg="8">
        <DashboardRotationSnapshotCard
          :total-jobs="rotationSummary.totalJobs"
          :total-active-jobs="rotationSummary.totalActiveJobs"
          :total-groups="rotationSummary.totalGroups"
          :total-assigned-groups="rotationSummary.totalRotationGroups"
          :last-updated-label="lastUpdatedLabel"
        />
      </v-col>
    </v-row>

    <v-row class="gy-6 mt-1">
      <v-col cols="12">
        <DashboardRotationOverview
          :items="rotationEntries"
          :status="rotationPreviewStatus"
          :error="rotationPreviewError"
        />
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
