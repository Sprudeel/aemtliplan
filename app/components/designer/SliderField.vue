<script setup lang="ts">
// Label + slider + current value.
withDefaults(defineProps<{ label: string; min: number; max: number; step?: number; unit?: string }>(), {
  step: 1,
  unit: "",
});
const model = defineModel<number>({ required: true });
</script>

<template>
  <UFormField :label="label">
    <div class="flex items-center gap-3">
      <USlider v-model="model" :min="min" :max="max" :step="step" class="flex-1" :aria-label="label" />
      <span class="w-12 text-right text-xs tabular-nums text-muted">{{ Math.round(model * 100) / 100 }}{{ unit }}</span>
    </div>
  </UFormField>
</template>
