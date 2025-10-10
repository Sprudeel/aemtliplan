<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useSnackbar } from "~/composables/useSnackbar"

type BackgroundResponse = { path: string | null }

const { data: backgroundSetting, refresh: refreshBackground } =
  await useFetch<BackgroundResponse>("/api/settings/background", {
    default: () => ({ path: null }),
  })

const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const uploading = ref(false)
const { open: openSnackbar } = useSnackbar()

watch(
  () => selectedFile.value,
  (file) => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
    if (file) {
      previewUrl.value = URL.createObjectURL(file)
    }
  },
)

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

const currentBackground = computed(() => backgroundSetting.value?.path ?? null)

const displayPreview = computed(
  () => previewUrl.value ?? currentBackground.value,
)

async function uploadBackground() {
  if (!selectedFile.value || uploading.value) return
  const formData = new FormData()
  formData.append("file", selectedFile.value)
  uploading.value = true
  try {
    await $fetch("/api/settings/background", {
      method: "POST",
      body: formData,
    })
    openSnackbar("Hintergrundbild aktualisiert.")
    selectedFile.value = null
    await refreshBackground()
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage ||
        "Hintergrund konnte nicht aktualisiert werden.",
      "error",
    )
  } finally {
    uploading.value = false
  }
}

function clearSelection() {
  selectedFile.value = null
}

async function resetToDefault() {
  if (uploading.value) return
  uploading.value = true
  try {
    await $fetch("/api/settings/background", { method: "DELETE" })
    openSnackbar("Hintergrundbild zurückgesetzt.")
    selectedFile.value = null
    await refreshBackground()
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage ||
        "Hintergrund konnte nicht zurückgesetzt werden.",
      "error",
    )
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <v-card class="pa-6 d-flex flex-column gap-5" elevation="2">
    <div>
      <div class="text-h6 font-weight-medium">Hintergrundbild</div>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Lade ein neues Titelbild für die öffentliche Ansicht hoch. Unterstützt
        werden PNG, JPEG und WebP.
      </p>
    </div>

    <div class="d-flex flex-column flex-md-row gap-4">
      <div class="flex-grow-1">
        <v-file-input
          v-model="selectedFile"
          accept="image/png, image/jpeg, image/webp"
          label="Neues Bild auswählen"
          prepend-inner-icon="mdi-image"
          show-size
          density="comfortable"
          variant="outlined"
          clearable
          @click:clear="clearSelection"
        />

        <div class="text-caption text-medium-emphasis mt-2">
          Empfohlen: Querformat, mindestens 1600px Breite.
        </div>
      </div>

      <div class="preview-container">
        <div class="text-caption text-medium-emphasis mb-2">Vorschau</div>
        <div class="preview-frame">
          <v-img
            v-if="displayPreview"
            :src="displayPreview"
            alt="Hintergrundvorschau"
            cover
            class="preview-image"
          />
          <div v-else class="preview-placeholder">Kein Bild ausgewählt</div>
        </div>
      </div>
    </div>

    <div class="d-flex justify-end gap-2">
      <v-btn
        variant="text"
        color="secondary"
        :disabled="uploading || !currentBackground"
        @click="resetToDefault"
      >
        Auf Standard zurücksetzen
      </v-btn>
      <v-btn
        color="primary"
        :loading="uploading"
        :disabled="!selectedFile || uploading"
        @click="uploadBackground"
      >
        Bild hochladen
      </v-btn>
    </div>
  </v-card>
</template>

<style scoped>
.preview-container {
  width: 100%;
  max-width: 320px;
}

.preview-frame {
  width: 100%;
  padding-top: 56.25%;
  position: relative;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
  background: rgba(0, 0, 0, 0.04);
}

.preview-image {
  position: absolute;
  inset: 0;
}

.preview-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.5);
  font-size: 0.85rem;
}
</style>
