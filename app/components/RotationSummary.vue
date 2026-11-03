<script setup lang="ts">
import type { RotationDto } from "~~/shared/types/api";

const props = defineProps<{ rotation: RotationDto }>();
const { t, d } = useI18n();
const changes = computed(
  () => props.rotation.after.filter((slot, i) => slot.groupId !== props.rotation.before[i]?.groupId).length,
);
const triggerColor = computed(() => ({ manual: "primary", schedule: "success", undo: "secondary" } as const)[props.rotation.trigger]);
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 text-sm">
    <UBadge :label="t(`rotation.trigger.${rotation.trigger}`)" :color="triggerColor" variant="subtle" />
    <span class="text-highlighted">{{ d(new Date(rotation.at), "dateTime") }}</span>
    <span class="text-muted">· {{ t("rotation.changes", changes) }}</span>
    <UBadge v-if="rotation.undoneAt" :label="t('rotation.wasUndone')" color="neutral" variant="outline" />
  </div>
</template>
