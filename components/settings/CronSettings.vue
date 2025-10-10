<script setup lang="ts">
import { Cron } from "croner"
import { computed, ref, watch } from "vue"
import { useSnackbar } from "~/composables/useSnackbar"

type RotationSettingResponse = { cron: string }

const presets = [
  { label: "Täglich (07:00)", value: "0 7 * * *" },
  { label: "Täglich (18:00)", value: "0 18 * * *" },
  { label: "Täglich (08:00, 11:00, 17:00)", value: "0 8,11,17 * * *" },
  { label: "Täglich (12:30)", value: "30 12 * * *" },
]

const previewFormatter = new Intl.DateTimeFormat("de-CH", {
  dateStyle: "medium",
  timeStyle: "short",
})

const { open: openSnackbar } = useSnackbar()
const defaultEnabledCron = presets[0].value

const {
  data: rotationSetting,
  status: rotationSettingStatus,
  refresh: refreshRotationSetting,
} = await useFetch<RotationSettingResponse>("/api/settings/cronsetting", {
  default: () => ({ cron: "" }),
})

const isRotationSettingLoading = computed(
  () => rotationSettingStatus.value === "pending",
)
const rotationCron = computed(() => (rotationSetting.value?.cron ?? "").trim())

const localCron = ref("")
const autoRotationEnabled = ref(true)
const lastActiveCron = ref(rotationCron.value || defaultEnabledCron)

watch(
  rotationCron,
  (value) => {
    const trimmed = value.trim()
    if (trimmed) {
      autoRotationEnabled.value = true
      localCron.value = trimmed
      lastActiveCron.value = trimmed
    } else {
      autoRotationEnabled.value = false
      localCron.value = ""
    }
  },
  { immediate: true },
)

const trimmedCron = computed(() => (localCron.value ?? "").trim())

function toggleAutoRotation(enabled: boolean | null) {
  if (enabled) {
    autoRotationEnabled.value = true
    localCron.value = lastActiveCron.value || defaultEnabledCron
    return
  }

  lastActiveCron.value =
    trimmedCron.value || lastActiveCron.value || defaultEnabledCron
  autoRotationEnabled.value = false
  localCron.value = ""
  return
}

watch(localCron, (value) => {
  const trimmed = (value ?? "").trim()
  if (trimmed) lastActiveCron.value = trimmed
})

const cronError = computed(() => {
  if (!autoRotationEnabled.value) return null
  const value = trimmedCron.value
  if (!value) return "Cron-Ausdruck darf nicht leer sein."
  try {
    const instance = new Cron(value, { maxRuns: 1, paused: true })
    instance.nextRun()
    instance.stop()
    return null
  } catch (error) {
    return "Ungültiger Cron-Ausdruck."
  }
})

const cronPreview = computed(() => {
  if (!autoRotationEnabled.value || cronError.value) return null
  try {
    const previewInstance = new Cron(trimmedCron.value, {
      maxRuns: 1,
      paused: true,
    })
    const next = previewInstance.nextRun()
    previewInstance.stop()
    if (!next) return "Es konnte kein nächster Zeitpunkt berechnet werden."
    return `Nächster Lauf: ${previewFormatter.format(next)}`
  } catch (error) {
    return null
  }
})

const rotationCronLabel = computed(() =>
  rotationCron.value ? rotationCron.value : "Deaktiviert",
)
const currentCronValue = computed(() =>
  autoRotationEnabled.value ? trimmedCron.value : "",
)
const savedCronValue = computed(() => rotationCron.value)
const isDirty = computed(() => currentCronValue.value !== savedCronValue.value)

const cronSaving = ref(false)

function applyPreset(value: string) {
  autoRotationEnabled.value = true
  localCron.value = value
  lastActiveCron.value = value
}

function resetCron() {
  const saved = rotationCron.value
  if (saved) {
    autoRotationEnabled.value = true
    localCron.value = saved
    lastActiveCron.value = saved
  } else {
    autoRotationEnabled.value = false
    localCron.value = ""
  }
}

async function saveRotationCron() {
  if (cronSaving.value || !isDirty.value) return
  if (autoRotationEnabled.value && cronError.value) return
  cronSaving.value = true
  const payload = autoRotationEnabled.value ? trimmedCron.value : ""
  try {
    rotationSetting.value = await $fetch<RotationSettingResponse>(
      "/api/settings/cronsetting",
      {
        method: "POST",
        body: { cron: payload },
      },
    )
    openSnackbar(
      autoRotationEnabled.value
        ? "Automatische Rotation aktualisiert."
        : "Automatische Rotation deaktiviert.",
    )
    await refreshRotationSetting()
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage ||
        "Rotation konnte nicht aktualisiert werden.",
      "error",
    )
  } finally {
    cronSaving.value = false
  }
}
</script>

<template>
  <v-card class="pa-6 d-flex flex-column gap-5" elevation="2">
    <div class="d-flex align-start justify-space-between flex-wrap gap-4">
      <div>
        <div class="text-h6 font-weight-medium">Automatische Rotation</div>
        <div class="text-body-2 text-medium-emphasis">
          Definiere, wann die Ämtli-Rotation automatisch durchgeführt wird.
        </div>
        <div class="text-caption mt-2">
          Hilfe zu Cron-Ausdrücken findest du z.B. auf der
          <a
            href="https://crontab.guru/"
            target="_blank"
            rel="noopener"
            class="text-primary"
          >
            crontab.guru
          </a>
          Referenzseite.
        </div>
      </div>
      <v-chip
        :color="rotationCron ? 'primary' : undefined"
        :variant="rotationCron ? 'tonal' : 'text'"
        prepend-icon="mdi-timer-cog-outline"
      >
        {{ rotationCronLabel }}
      </v-chip>
    </div>

    <v-switch
      :model-value="autoRotationEnabled"
      label="Automatische Rotation aktivieren"
      color="primary"
      hide-details
      inset
      :disabled="isRotationSettingLoading"
      @update:model-value="toggleAutoRotation"
    />

    <div class="d-flex flex-wrap gap-2">
      <v-chip
        v-for="preset in presets"
        :key="preset.value"
        :color="preset.value === trimmedCron ? 'primary' : undefined"
        :variant="preset.value === trimmedCron ? 'elevated' : 'tonal'"
        class="text-caption"
        :disabled="!autoRotationEnabled || isRotationSettingLoading"
        @click="applyPreset(preset.value)"
      >
        {{ preset.label }}
      </v-chip>
    </div>

    <v-text-field
      v-model="localCron"
      label="Cron-Ausdruck"
      hint="Beispiel: 0 7 * * * (07:00 Uhr jeden Tag)"
      persistent-hint
      density="comfortable"
      variant="outlined"
      :disabled="!autoRotationEnabled || isRotationSettingLoading"
      :loading="cronSaving"
      :error="autoRotationEnabled && Boolean(cronError)"
      :error-messages="cronError ? [cronError] : []"
    />

    <div v-if="autoRotationEnabled">
      <div v-if="cronPreview" class="text-caption text-medium-emphasis">
        {{ cronPreview }}
      </div>
      <div v-else-if="!cronError" class="text-caption text-medium-emphasis">
        Es konnte kein nächster Zeitpunkt berechnet werden.
      </div>
    </div>
    <div v-else class="text-caption text-medium-emphasis">
      Automatische Rotation ist deaktiviert.
    </div>

    <div class="d-flex flex-wrap gap-2 justify-end">
      <v-btn
        variant="text"
        color="secondary"
        :disabled="!isDirty || cronSaving || isRotationSettingLoading"
        @click="resetCron"
      >
        Zurücksetzen
      </v-btn>
      <v-btn
        color="primary"
        :loading="cronSaving"
        :disabled="
          !isDirty ||
          (autoRotationEnabled && Boolean(cronError)) ||
          cronSaving ||
          isRotationSettingLoading
        "
        @click="saveRotationCron"
      >
        Speichern
      </v-btn>
    </div>
  </v-card>
</template>

<style scoped></style>
