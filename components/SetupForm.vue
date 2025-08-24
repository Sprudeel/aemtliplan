<script setup lang="ts">
import { ref } from 'vue'
const email = ref(''); const password = ref(''); const name = ref('')
const error = ref<string | null>(null)
async function submit() {
  error.value = null
  try {
    await $fetch('/api/auth/register', { method: 'POST', body: { email: email.value, password: password.value, name: name.value || undefined } })
    window.location.reload() // re-render index now that initialized
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message
  }
}
</script>

<template>
  <form @submit.prevent="submit" class="space-y-3">
    <input v-model="email" type="email" placeholder="Admin email" class="w-full border rounded px-3 py-2" required />
    <input v-model="password" type="password" placeholder="Password (min 8)" class="w-full border rounded px-3 py-2" required />
    <input v-model="name" type="text" placeholder="Name" class="w-full border rounded px-3 py-2" />
    <button class="px-4 py-2 rounded bg-black text-white">Create admin</button>
    <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
  </form>
</template>