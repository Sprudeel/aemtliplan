<!-- pages/index.vue -->
<script setup lang="ts">
const { data: setup } = await useFetch('/api/setup')
const { data: user } = await useFetch('/api/user')
const setupMode = computed(() => !setup.value?.initialized)
</script>

<template>
  <div class="max-w-md mx-auto p-8">
    <template v-if="setupMode">
      <SetupForm />
    </template>

    <template v-else>
      <!-- Your normal app home. Replace with your real UI. -->
      <h1 class="text-2xl font-semibold mb-2">Hello, {{ user.name }}!</h1>
      <v-range-slider></v-range-slider>
      <p class="text-gray-600 mb-4">You’re ready to go.</p>
      <NuxtLink to="/login" class="underline">Login</NuxtLink>
    </template>
  </div>
</template>