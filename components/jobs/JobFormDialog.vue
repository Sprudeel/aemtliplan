<script setup lang="ts">
import { computed, reactive, watch } from "vue"
import type { JobFormPayload, JobRecord } from "~/types/jobs"

const props = defineProps<{
  modelValue: boolean
  loading?: boolean
  title: string
  submitLabel: string
  initialValue?: Partial<JobRecord> | null
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void
  (event: "submit", payload: JobFormPayload): void
}>()

const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
})

const form = reactive<JobFormPayload>({
  name: "",
  icon: "",
  description: "",
})

const isValid = computed(() => Boolean(form.name.trim() && form.icon.trim()))

function populateForm(source?: Partial<JobRecord> | null) {
  form.name = source?.name ?? ""
  form.icon = source?.icon ?? ""
  form.description = source?.description ?? ""
}

watch(
  () => props.initialValue,
  (value) => {
    if (props.modelValue) {
      populateForm(value)
    }
  },
  { immediate: true },
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      populateForm(props.initialValue)
      return
    }
    populateForm(null)
  },
)

function handleSubmit() {
  if (!isValid.value || props.loading) return
  emit("submit", {
    name: form.name.trim(),
    icon: form.icon.trim(),
    description: form.description.trim(),
  })
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="520">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ title }}</span>
        <v-btn icon="mdi-close" variant="text" @click="dialog = false" />
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-form class="d-flex flex-column gap-4">
          <v-text-field
            v-model="form.name"
            label="Titel"
            required
            variant="outlined"
            density="comfortable"
            hint="Name des Ämtlis"
          />
          <v-text-field
            v-model="form.icon"
            label="Icon"
            required
            variant="outlined"
            density="comfortable"
            hint="Material Design Icon (mdi-*) oder Emoji"
          />
          <v-textarea
            v-model="form.description"
            label="Beschreibung"
            variant="outlined"
            density="comfortable"
            rows="4"
            auto-grow
          />
        </v-form>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="dialog = false">Abbrechen</v-btn>
        <v-btn
          color="primary"
          :disabled="!isValid || loading"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ submitLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.gap-4 {
  gap: 16px;
}
</style>
