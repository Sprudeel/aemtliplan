<script setup lang="ts">
// Colored group name. `null` shows "nobody".
const props = defineProps<{ group: { name: string; color: string } | null; size?: "sm" | "md" }>();
const { t } = useI18n();
const style = computed(() =>
  props.group ? { backgroundColor: props.group.color, color: contrastText(props.group.color) } : undefined,
);
</script>

<template>
  <span
    v-if="group"
    class="inline-flex items-center rounded-full font-medium"
    :class="size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'"
    :style="style"
  >{{ group.name }}</span>
  <span v-else class="text-sm text-dimmed">{{ t("common.nobody") }}</span>
</template>
