<script setup lang="ts">
import { ref } from 'vue'
const email = ref(''); const password = ref(''); const error = ref<string | null>(null)
const { data: setup } = await useFetch('/api/setup')
if (!setup.value?.initialized) navigateTo('/') // no login until after bootstrap

async function login() {
  error.value = null
  try { await $fetch('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } }); navigateTo('/') }
  catch (e: any) { error.value = e?.data?.statusMessage || e?.message }
}
</script>

<template>
  <div class="max-w-md mx-auto p-8 space-y-4">
    <h1 class="text-2xl font-semibold">Login</h1>
    <form @submit.prevent="login" class="space-y-3">
      <input v-model="email" type="email" placeholder="Email" class="w-full border rounded px-3 py-2" required />
      <input v-model="password" type="password" placeholder="Password" class="w-full border rounded px-3 py-2" required />
      <button class="px-4 py-2 rounded bg-black text-white">Sign in</button>
      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
    </form>
  </div>
</template>