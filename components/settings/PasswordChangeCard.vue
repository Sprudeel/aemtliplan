<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { useSnackbar } from "~/composables/useSnackbar"

const form = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
})

const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const loading = ref(false)

const { open: openSnackbar } = useSnackbar()

const passwordsMatch = computed(
  () => form.newPassword && form.newPassword === form.confirmPassword,
)

const canSubmit = computed(
  () =>
    form.currentPassword.length >= 8 &&
    form.newPassword.length >= 8 &&
    passwordsMatch.value &&
    !loading.value,
)

function resetForm() {
  form.currentPassword = ""
  form.newPassword = ""
  form.confirmPassword = ""
  showCurrent.value = false
  showNew.value = false
  showConfirm.value = false
}

async function handleSubmit() {
  if (!canSubmit.value) return
  loading.value = true
  try {
    await $fetch("/api/auth/password", {
      method: "POST",
      body: {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      },
    })
    openSnackbar("Passwort erfolgreich aktualisiert.")
    resetForm()
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage || "Passwort konnte nicht geändert werden.",
      "error",
    )
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-card class="pa-6 d-flex flex-column gap-5" elevation="2">
    <div>
      <div class="text-h6 font-weight-medium">Passwort ändern</div>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Vergiss nicht, ein starkes Passwort mit mindestens 8 Zeichen zu wählen.
      </p>
    </div>

    <v-form class="d-flex flex-column gap-4" @submit.prevent="handleSubmit">
      <v-text-field
        v-model="form.currentPassword"
        :type="showCurrent ? 'text' : 'password'"
        label="Aktuelles Passwort"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showCurrent ? 'mdi-eye-off' : 'mdi-eye'"
        @click:append-inner="showCurrent = !showCurrent"
        density="comfortable"
        variant="outlined"
        autocomplete="current-password"
        required
      />

      <v-text-field
        v-model="form.newPassword"
        :type="showNew ? 'text' : 'password'"
        label="Neues Passwort"
        prepend-inner-icon="mdi-lock-reset"
        :append-inner-icon="showNew ? 'mdi-eye-off' : 'mdi-eye'"
        @click:append-inner="showNew = !showNew"
        density="comfortable"
        variant="outlined"
        autocomplete="new-password"
        required
      />

      <v-text-field
        v-model="form.confirmPassword"
        :type="showConfirm ? 'text' : 'password'"
        label="Neues Passwort bestätigen"
        prepend-inner-icon="mdi-lock-check"
        :append-inner-icon="showConfirm ? 'mdi-eye-off' : 'mdi-eye'"
        @click:append-inner="showConfirm = !showConfirm"
        density="comfortable"
        variant="outlined"
        autocomplete="new-password"
        :error="Boolean(form.confirmPassword) && !passwordsMatch"
        :error-messages="
          !passwordsMatch && form.confirmPassword
            ? ['Passwörter stimmen nicht überein.']
            : []
        "
        required
      />

      <div class="d-flex justify-end">
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!canSubmit"
          type="submit"
        >
          Passwort speichern
        </v-btn>
      </div>
    </v-form>
  </v-card>
</template>
