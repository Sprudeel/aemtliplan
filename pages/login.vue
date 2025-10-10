<script setup lang="ts">
import { ref } from "vue"

const email = ref("")
const password = ref("")
const error = ref<string | null>(null)
const loading = ref(false)
const passwordVisible = ref(false)

const { data: setup } = await useFetch("/api/setup")
if (!setup.value?.initialized) navigateTo("/")

async function login() {
  if (!email.value || !password.value || loading.value) return
  error.value = null
  loading.value = true
  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { email: email.value, password: password.value },
    })
    navigateTo("/dashboard")
  } catch (e: any) {
    error.value =
      e?.data?.statusMessage || e?.message || "Anmeldung fehlgeschlagen."
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-slate-50">
    <div
      class="absolute inset-0 bg-gradient-to-br from-primary/20 via-white to-primary/10"
    ></div>
    <div
      class="absolute -top-20 -left-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl"
    ></div>
    <div
      class="absolute bottom-[-120px] right-[-60px] h-72 w-72 rounded-full bg-sky-300/30 blur-3xl"
    ></div>

    <div
      class="relative z-10 flex items-center justify-center px-6 py-12 lg:px-8"
    >
      <v-card
        class="w-full max-w-2xl overflow-hidden border border-white/40 bg-white/70 backdrop-blur-xl shadow-2xl"
        elevation="8"
      >
        <div class="">
          <div class="col-span-1 lg:col-span-3 p-6 sm:p-8 lg:p-12">
            <div class="flex flex-col gap-3 text-center lg:text-left">
              <v-avatar
                size="96"
                color="white"
                variant="tonal"
                class="self-center"
              >
                <img src="/logo2.png" alt="Logo" />
              </v-avatar>
              <span
                class="text-xs font-semibold uppercase tracking-[0.4em] text-primary/70"
                >Login</span
              >
              <h1 class="text-3xl lg:text-4xl font-semibold text-slate-900">
                Willkommen zurück
              </h1>
              <p class="text-medium-emphasis text-sm lg:text-base">
                Melde dich mit deinem Konto an, um Jobs, Gruppen und Rotationen
                zu pflegen.
              </p>
            </div>

            <v-form class="mt-8 flex flex-col gap-6" @submit.prevent="login">
              <v-text-field
                v-model="email"
                label="E-Mail"
                type="email"
                autocomplete="email"
                prepend-inner-icon="mdi-email-outline"
                density="comfortable"
                variant="outlined"
                required
              />
              <v-text-field
                v-model="password"
                :type="passwordVisible ? 'text' : 'password'"
                label="Passwort"
                autocomplete="current-password"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="passwordVisible ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="passwordVisible = !passwordVisible"
                density="comfortable"
                variant="outlined"
                required
              />

              <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                density="comfortable"
              >
                {{ error }}
              </v-alert>

              <v-btn
                block
                height="52"
                color="primary"
                class="text-base font-medium tracking-wide shadow-lg shadow-primary/20 hover:shadow-xl transition-shadow duration-200"
                :loading="loading"
                type="submit"
              >
                Anmelden
              </v-btn>
            </v-form>

            <div
              class="mt-6 text-xs text-medium-emphasis text-center lg:text-left"
            >
              Probleme bei der Anmeldung? Bitte kontaktiere deine
              Administratorin oder deinen Administrator.
            </div>
          </div>
        </div>
      </v-card>
    </div>
  </div>
</template>
