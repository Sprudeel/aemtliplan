<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  modelValue: boolean
  title: string
  loading?: boolean
  confirmLabel?: string
  cancelLabel?: string
  icon?: string
  color?: string
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void
  (event: "confirm"): void
}>()

const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
})

const confirmLabel = computed(() => props.confirmLabel ?? "Löschen")
const cancelLabel = computed(() => props.cancelLabel ?? "Abbrechen")
const icon = computed(() => props.icon ?? "mdi-alert")
const color = computed(() => props.color ?? "error")
</script>

<template>
  <v-dialog v-model="dialog" max-width="420">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon :icon="icon" :color="color" class="me-2" />
        <span>{{ title }}</span>
      </v-card-title>
      <v-card-text>
        <slot>
          <p class="text-body-2 mb-0">Bist du sicher?</p>
        </slot>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="dialog = false">{{ cancelLabel }}</v-btn>
        <v-btn :color="color" :loading="loading" @click="emit('confirm')">
          {{ confirmLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
