<script setup lang="ts">
const props = defineProps<{
  c: any
}>()
</script>

<template>
  <article
    class="max-w-72 rounded-2xl border border-gray-200/70 bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col"
  >
    <!-- Job header -->
    <div class="p-4 flex items-start gap-3 grow-0">
      <div class="text-3xl leading-none mt-0.5">{{ c.icon }}</div>
      <div class="min-w-0">
        <h2 class="font-semibold truncate">{{ c.jobName }}</h2>
        <p v-if="c.description" class="text-gray-500 text-sm line-clamp-2">
          {{ c.description }}
        </p>
      </div>
    </div>

    <v-divider />

    <!-- Assigned group & members -->
    <div class="px-4 pt-3 pb-4 grow overflow-y-scroll">
      <div class="mb-2 text-xs uppercase tracking-wide text-gray-500">
        Zugeordnete Gruppe
      </div>
      <div class="flex items-center gap-2 mb-3">
        <v-chip
          :color="c.color"
          variant="flat"
          prepend-icon="mdi-account-group-outline"
        >
          {{ c.groupName }}
        </v-chip>
      </div>

      <div class="text-xs uppercase tracking-wide text-gray-500 mb-1">
        Mitglieder
      </div>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="(m, i) in c.members"
          :key="i"
          class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs text-gray-700 bg-gray-50"
        >
          {{ m || "—" }}
        </span>
        <span v-if="!c.members?.length" class="text-gray-400 text-xs"
          >Keine Mitglieder</span
        >
      </div>
    </div>
  </article>
</template>

<style scoped></style>
