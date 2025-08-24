<script setup lang="ts">
import { ref } from 'vue'
import { useField, useForm } from 'vee-validate'

const { handleSubmit, isSubmitting } = useForm()

// Email
const { value: email, errorMessage: emailError } = useField<string>('email', (val: string | undefined) => {
  if (!val) return 'Email ist erforderlich.'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Bitte eine gültige E-Mail eingeben.'
})

// Password
const { value: password, errorMessage: passwordError } = useField<string>('password', (val: string | undefined) => {
  if (!val) return 'Passwort ist erforderlich.'
  return (val.length >= 8) || 'Passwort muss mindestens 8 Zeichen haben.'
})

// Name
const { value: name, errorMessage: nameError } = useField<string | undefined>('name', (val: string | undefined) => {
  if (!val) return 'Name ist erforderlich.'
  return (val.trim().length >= 2) || 'Name muss mindestens 2 Zeichen haben.'
})

const error = ref<string | null>(null)

const onSubmit = handleSubmit(async (values) => {
  error.value = null
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        email: values.email,
        password: values.password,
        name: values.name || undefined,
      },
    })
    window.location.reload()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Registrierung fehlgeschlagen.'
  }
})
</script>

<template>
  <div class="text-center py-6">
    <img class="w-48  my-8 mx-auto m-6" src="~/public/logo.png" alt="">
    <h1 class="text-2xl font-semibold mb-2">Hallo 👋</h1>
    <p class="text-gray-600 mb-6">
      Danke, dass du diese App aufgesetzt hast. Erstelle das erste Admin-Konto, um zu beginnen.
      Keine Ahnung, was auf dich zukommt? Keine Angst, lies am besten die Anleitung.
    </p>
  </div>

  <v-form @submit.prevent="onSubmit" class="space-y-3">
    <v-text-field
        v-model="name"
        type="text"
        placeholder="Name"
        :error-messages="nameError ? [nameError] : []"
        hide-details="auto"
    />
    <v-text-field
        v-model="email"
        type="email"
        placeholder="Email"
        :error-messages="emailError ? [emailError] : []"
        required
        hide-details="auto"
    />
    <v-text-field
        v-model="password"
        type="password"
        placeholder="Passwort (mind. 8)"
        :error-messages="passwordError ? [passwordError] : []"
        required
        hide-details="auto"
    />
    <div class="w-full flex justify-center p-6">
      <v-btn
          type="submit"
          class="px-4 py-2 rounded bg-blue  text-white"
          :loading="isSubmitting"
      >
        Create admin
      </v-btn>
    </div>


    <p v-if="error" class="text-red-600 text-sm mt-2">{{ error }}</p>
  </v-form>
</template>