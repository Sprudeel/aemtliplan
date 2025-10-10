<script setup lang="ts">
import { computed } from "vue"
import type { JobRecord } from "~/types/jobs"

const props = defineProps<{
  items: JobRecord[]
  status: string
  error?: Error | null
}>()

const emit = defineEmits<{
  (event: "edit", job: JobRecord): void
  (event: "delete", job: JobRecord): void
}>()

const headers = [
  { title: "Ämtli", key: "name", align: "start" as const },
  { title: "Icon", key: "icon", width: 120 },
  { title: "Beschreibung", key: "description" },
  { title: "Aktionen", key: "actions", sortable: false, width: 140 },
]

function resolveRow(slotItem: any): JobRecord {
  return (slotItem?.raw ?? slotItem?.item ?? slotItem) as JobRecord
}

const isLoading = computed(() => props.status === "pending")
</script>

<template>
  <div>
    <template v-if="isLoading">
      <v-skeleton-loader type="table" class="mt-4" />
    </template>
    <template v-else-if="error">
      <v-alert type="error" variant="tonal">
        {{ error?.message || "Fehler beim Laden der Ämtli." }}
      </v-alert>
    </template>
    <template v-else-if="!items.length">
      <v-alert type="info" variant="tonal">
        Keine Ämtli gefunden. Lege ein neues Ämtli an, um zu starten.
      </v-alert>
    </template>
    <template v-else>
      <v-data-table
        :headers="headers"
        :items="items"
        :items-per-page="10"
        class="jobs-table"
      >
        <template #item.icon="{ item }">
          <div class="d-flex align-center">
            <v-avatar size="32" color="primary" variant="tonal" class="mr-2">
              <template v-if="resolveRow(item).icon?.startsWith('mdi-')">
                <v-icon :icon="resolveRow(item).icon" />
              </template>
              <template v-else>
                <span class="text-subtitle-2">{{ resolveRow(item).icon }}</span>
              </template>
            </v-avatar>
          </div>
        </template>

        <template #item.description="{ item }">
          <span class="text-body-2">{{
            resolveRow(item).description || "—"
          }}</span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              icon="mdi-pencil"
              @click="emit('edit', resolveRow(item))"
            />
            <v-btn
              size="small"
              variant="text"
              color="error"
              icon="mdi-delete"
              @click="emit('delete', resolveRow(item))"
            />
          </div>
        </template>
      </v-data-table>
    </template>
  </div>
</template>

<style scoped>
.jobs-table :deep(.v-data-table__td) {
  vertical-align: middle;
}

.jobs-table :deep(thead th) {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: rgba(0, 0, 0, 0.54);
}

.jobs-table :deep(.v-btn--density-default) {
  min-width: 0;
}

.gap-1 {
  gap: 4px;
}

@media (max-width: 600px) {
  .jobs-table :deep(.v-data-table__wrapper) {
    overflow-x: auto;
  }
}
</style>
