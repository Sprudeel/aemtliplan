<script setup lang="ts">
import { computed, reactive, watch } from "vue"
import type { GroupFormPayload, GroupRecord } from "~/types/groups"

const props = defineProps<{
  modelValue: boolean
  loading?: boolean
  title: string
  submitLabel: string
  initialValue?: Partial<GroupRecord> | null
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void
  (event: "submit", payload: GroupFormPayload): void
}>()

const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
})

const form = reactive<GroupFormPayload>({
  name: "",
  color: "#90CAF9",
  members: [],
  inRotation: true,
})

const cleanMembers = computed(() =>
  Array.from(
    new Set(
      form.members
        .map((member) => member?.trim())
        .filter((member): member is string => Boolean(member)),
    ),
  ),
)

const isValid = computed(
  () => Boolean(form.name.trim()) && cleanMembers.value.length > 0,
)

function populateForm(source?: Partial<GroupRecord> | null) {
  form.name = source?.name ?? ""
  form.color = source?.color ?? "#90CAF9"
  form.members = (source?.members ?? []).map((member) => member.name)
  form.inRotation = source?.inRotation ?? true
}

watch(
  () => props.initialValue,
  (value) => {
    if (props.modelValue) {
      populateForm(value)
    }
  },
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
  { immediate: true },
)

function handleSubmit() {
  if (!isValid.value || props.loading) return
  emit("submit", {
    name: form.name.trim(),
    color: form.color,
    members: cleanMembers.value,
    inRotation: form.inRotation,
  })
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="560">
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
            label="Name"
            required
            variant="outlined"
            density="comfortable"
          />
          <v-color-picker
            v-model="form.color"
            mode="hex"
            hide-inputs
            elevation="0"
            class="color-picker"
          />
          <v-switch
            v-model="form.inRotation"
            color="primary"
            hide-details
            inset
            label="In Rotationszyklus aufnehmen"
          />
          <v-combobox
            v-model="form.members"
            label="Mitglieder"
            chips
            multiple
            clearable
            variant="outlined"
            density="comfortable"
            hint="Mit Enter bestätigen"
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

.color-picker {
  max-width: 280px;
}

@media (max-width: 600px) {
  .color-picker {
    max-width: 100%;
  }
}
</style>
