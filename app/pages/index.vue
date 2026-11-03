<script setup lang="ts">
// Signed-in users land on their plans; the auth middleware sends everyone else to /login.
await navigateTo("/plans", { replace: true });
</script>

<template>
  <div />
</template>
