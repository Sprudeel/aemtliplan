<script setup lang="ts">
import { computed, toRefs } from "vue"

const props = defineProps<{
  modelValue: string
  filteredCount: number
  totalCount: number
  label?: string
  placeholder?: string
  summaryLabel?: string
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void
}>()

const search = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
})

const { filteredCount, totalCount, summaryLabel } = toRefs(props)

const summaryText = computed(() => {
  const noun = summaryLabel.value ?? "Einträge"
  return `${filteredCount.value} von ${totalCount.value} ${noun} angezeigt`
})
</script>

<template>
  <v-sheet class="mt-6 p-4" rounded="lg" color="grey-lighten-4">
    <div class="flex gap-3 m-0 p-0 flex-col lg:flex-row lg:items-center">
      <v-text-field
        v-model="search"
        :label="label || 'Suchen'"
        :placeholder="placeholder"
        prepend-inner-icon="mdi-magnify"
        density="comfortable"
        variant="outlined"
        hide-details="true"
        class="flex-grow-1"
        clearable
        clear-icon="mdi-close-circle"
        @click:clear="() => (search = '')"
      />
      <div class="text-sm text-gray-400 align-self-center">
        <slot
          name="summary"
          :filtered-count="filteredCount"
          :total-count="totalCount"
          :summary-label="summaryLabel"
        >
          {{ summaryText }}
        </slot>
      </div>
    </div>
  </v-sheet>
</template>

<style scoped></style>
