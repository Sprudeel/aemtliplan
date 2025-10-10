<script setup lang="ts">
import { Cron } from "croner"
import { computed, ref } from "vue"
import { useSnackbar } from "~/composables/useSnackbar"

type RotationSettingResponse = { cron: string }

const emit = defineEmits<{
  (event: "rotation-forced"): void
}>()

const { open: openSnackbar } = useSnackbar()

const { data: rotationSetting } = await useFetch<RotationSettingResponse>(
  "/api/settings/cronsetting",
  {
    default: () => ({ cron: "" }),
  },
)

const forcingRotation = ref(false)

const detailedFormatter = new Intl.DateTimeFormat("de-CH", {
  dateStyle: "full",
  timeStyle: "short",
})

const rotationCron = computed(() => (rotationSetting.value?.cron ?? "").trim())
const rotationEnabled = computed(() => Boolean(rotationCron.value))

const nextRotationRun = computed<Date | null>(() => {
  if (!rotationEnabled.value) return null
  const cronValue = rotationCron.value
  try {
    const cron = new Cron(cronValue, { maxRuns: 1, paused: true })
    const next = cron.nextRun()
    cron.stop()
    return next ?? null
  } catch (e) {
    console.warn("Invalid rotation cron expression", e)
    return null
  }
})

const nextRotationLabel = computed(() => {
  if (!rotationEnabled.value) return "Automatische Rotation deaktiviert"
  if (!nextRotationRun.value) return "Noch kein Zeitplan festgelegt"
  return detailedFormatter.format(nextRotationRun.value)
})

const nextRotationCountdown = computed(() => {
  if (!nextRotationRun.value) return null
  const diffMs = nextRotationRun.value.getTime() - Date.now()
  if (diffMs <= 0) return "gleich fällig"
  const minutes = Math.floor(diffMs / (1000 * 60))
  const days = Math.floor(minutes / (60 * 24))
  const hours = Math.floor((minutes % (60 * 24)) / 60)
  const mins = minutes % 60
  const segments: string[] = []
  if (days) segments.push(`${days} Tag${days === 1 ? "" : "e"}`)
  if (hours) segments.push(`${hours} Std.`)
  if (!days && mins) segments.push(`${mins} Min.`)
  return segments.length ? segments.join(" ") : "unter 1 Minute"
})

async function forceRotationNow() {
  if (forcingRotation.value) return
  forcingRotation.value = true
  try {
    await $fetch("/api/matchings/matchings.rotate", {
      method: "POST",
      body: { step: 1 },
    })
    openSnackbar("Rotation manuell ausgelöst.")
    emit("rotation-forced")
  } catch (error: any) {
    const statusMessage = error?.data?.statusMessage
    if (statusMessage === "No groups in ring") {
      openSnackbar(
        "Keine Gruppen im Rotationszyklus. Bitte aktiviere mindestens eine Gruppe.",
        "error",
      )
    } else if (statusMessage === "No jobs in ring") {
      openSnackbar(
        "Keine Ämtli im Rotationsring. Bitte lege Jobs an oder ordne die Reihenfolge neu.",
        "error",
      )
    } else {
      openSnackbar(
        statusMessage || "Rotation konnte nicht ausgelöst werden.",
        "error",
      )
    }
  } finally {
    forcingRotation.value = false
  }
}
</script>

<template>
  <v-card class="h-100 pa-5 d-flex flex-column gap-5" elevation="2">
    <div class="d-flex align-center">
      <v-avatar size="46" color="primary" variant="tonal">
        <v-icon icon="mdi-calendar-clock" size="28" />
      </v-avatar>
      <div class="ms-4">
        <div class="text-subtitle-1 font-weight-medium">
          Nächste geplante Rotation
        </div>
        <div class="text-body-2 text-medium-emphasis">
          {{ nextRotationLabel }}
        </div>
      </div>
    </div>

    <div>
      <template v-if="rotationEnabled">
        <div
          v-if="nextRotationCountdown"
          class="text-caption text-medium-emphasis"
        >
          In {{ nextRotationCountdown }}
        </div>
        <div v-else class="text-caption text-error">
          Cron-Plan konnte nicht ermittelt werden.
        </div>
      </template>
      <div v-else class="text-caption text-medium-emphasis">
        Automatische Rotation ist deaktiviert.
      </div>

      <v-btn
        color="primary"
        variant="elevated"
        :loading="forcingRotation"
        :disabled="forcingRotation"
        @click="forceRotationNow"
        class="mt-4"
      >
        Rotation jetzt auslösen
      </v-btn>
    </div>

    <v-divider />

    <div class="d-flex flex-column gap-3">
      <div>
        <div class="text-subtitle-2 font-weight-medium">
          Automatische Rotation anpassen
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Den Zeitplan kannst du in den Einstellungen ändern oder sofort eine
          Rotation auslösen.
        </p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <v-btn color="primary" variant="tonal" to="/settings">
          Zu den Einstellungen
        </v-btn>
      </div>
    </div>
  </v-card>
</template>
