<script setup lang="ts">
import type { AssignmentDto, GroupDto } from "~~/shared/types/api";

const props = defineProps<{ assignments: AssignmentDto[]; groups: GroupDto[] }>();
const { t } = useI18n();

const stats = computed(() => {
  const assigned = props.assignments.filter((entry) => entry.group).length;
  const inRotation = props.groups.filter((group) => group.inRotation);
  const busyGroups = new Set(props.assignments.map((entry) => entry.group?.id).filter(Boolean));
  const idle = inRotation.filter((group) => !busyGroups.has(group.id)).length;
  return [
    { key: "jobs", icon: "i-lucide-list-checks", value: props.assignments.length },
    { key: "open", icon: "i-lucide-circle-dashed", value: props.assignments.length - assigned },
    { key: "groups", icon: "i-lucide-users", value: inRotation.length },
    { key: "idle", icon: "i-lucide-coffee", value: idle },
  ];
});
</script>

<template>
  <UPageGrid class="grid-cols-2 lg:grid-cols-4 gap-4">
    <UPageCard
      v-for="stat in stats"
      :key="stat.key"
      :icon="stat.icon"
      :title="t(`dashboard.stats.${stat.key}`)"
      variant="subtle"
      :ui="{ container: 'gap-y-1.5', title: 'font-normal text-muted text-xs uppercase' }"
      :data-testid="`stat-${stat.key}`"
    >
      <span class="text-2xl font-semibold text-highlighted">{{ stat.value }}</span>
    </UPageCard>
  </UPageGrid>
</template>
