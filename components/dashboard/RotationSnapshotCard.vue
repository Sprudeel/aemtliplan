<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  totalJobs: number
  totalActiveJobs: number
  totalGroups: number
  totalAssignedGroups: number
  lastUpdatedLabel: string
}>()

const totalUnassignedJobs = computed(() =>
  Math.max(props.totalJobs - props.totalActiveJobs, 0),
)
const totalUnassignedGroups = computed(() =>
  Math.max(props.totalGroups - props.totalAssignedGroups, 0),
)

const jobCoverage = computed(() => {
  if (!props.totalJobs) return 0
  return Math.round((props.totalActiveJobs / props.totalJobs) * 100)
})

const groupCoverage = computed(() => {
  if (!props.totalGroups) return 0
  return Math.round((props.totalAssignedGroups / props.totalGroups) * 100)
})

const metrics = computed(() => [
  {
    key: "jobs-total",
    label: "Jobs gesamt",
    value: props.totalJobs,
    detail: `${props.totalActiveJobs} aktiv`,
    icon: "mdi-briefcase-outline",
    iconBg: "#E2E8F0",
    iconColor: "#1F2937",
  },
  {
    key: "jobs-open",
    label: "Offene Jobs",
    value: totalUnassignedJobs.value,
    detail: `Abdeckung ${jobCoverage.value}%`,
    icon: "mdi-briefcase-off-outline",
    iconBg: "#FEE2E2",
    iconColor: "#B91C1C",
  },
  {
    key: "groups-total",
    label: "Gruppen gesamt",
    value: props.totalGroups,
    detail: `${props.totalAssignedGroups} eingesetzt`,
    icon: "mdi-account-group-outline",
    iconBg: "#E0E7FF",
    iconColor: "#312E81",
  },
  {
    key: "groups-free",
    label: "Freie Gruppen",
    value: totalUnassignedGroups.value,
    detail: `Auslastung ${groupCoverage.value}%`,
    icon: "mdi-account-multiple-minus-outline",
    iconBg: "#DCFCE7",
    iconColor: "#166534",
  },
])
</script>

<template>
  <div
    class="h-full rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm"
  >
    <div class="flex items-center gap-4">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600"
      >
        <i class="mdi mdi-clipboard-pulse-outline text-xl"></i>
      </div>
      <div>
        <h3 class="text-lg font-semibold text-slate-900">Rotation Snapshot</h3>
        <p class="text-sm text-slate-500">
          Status der aktuellen Ämtli-Zuordnung
        </p>
      </div>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <div
        v-for="metric in metrics"
        :key="metric.key"
        class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-3"
      >
        <div
          class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          :style="{ backgroundColor: metric.iconBg, color: metric.iconColor }"
        >
          <i :class="['mdi', metric.icon, 'text-base']"></i>
        </div>
        <div class="flex flex-col">
          <span
            class="text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            >{{ metric.label }}</span
          >
          <span class="text-lg font-semibold text-slate-900">{{
            metric.value
          }}</span>
          <span class="text-xs text-slate-500">{{ metric.detail }}</span>
        </div>
      </div>
    </div>

    <div class="mt-5 text-xs text-slate-500">
      Aktualisiert: {{ props.lastUpdatedLabel }}
    </div>
  </div>
</template>
