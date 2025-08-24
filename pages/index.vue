<template>
  <div>TES</div>
  <pre>{{ data.test }}</pre>
</template>

<script setup lang="ts">
const { data } = await useFetch('/api/test');
</script>
