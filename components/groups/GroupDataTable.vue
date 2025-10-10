<script setup lang="ts">
import { computed } from "vue"
import type { GroupRecord } from "~/types/groups"

const props = defineProps<{
  items: GroupRecord[]
  status: string
  error?: Error | null
}>()

const emit = defineEmits<{
  (event: "edit", group: GroupRecord): void
  (event: "delete", group: GroupRecord): void
}>()

const headers = [
  { title: "Gruppe", key: "name", align: "start" as const },
  { title: "Farbe", key: "color", width: 160 },
  { title: "Mitglieder", key: "members" },
  { title: "Rotation", key: "inRotation", width: 140 },
  { title: "Aktionen", key: "actions", sortable: false, width: 140 },
]

function resolveRow(slotItem: any): GroupRecord {
  return (slotItem?.raw ?? slotItem?.item ?? slotItem) as GroupRecord
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
        {{ error?.message || "Fehler beim Laden der Gruppen." }}
      </v-alert>
    </template>
    <template v-else-if="!items.length">
      <v-alert type="info" variant="tonal">
        Keine Gruppen gefunden. Lege eine neue Gruppe an, um zu starten.
      </v-alert>
    </template>
    <template v-else>
      <v-data-table
        :headers="headers"
        :items="items"
        :items-per-page="10"
        class="groups-table"
      >
        <template #item.color="{ item }">
          <div class="d-flex align-center gap-2">
            <v-chip
              size="small"
              :style="{
                backgroundColor: resolveRow(item).color,
                color: '#fff',
              }"
              label
            >
              {{ resolveRow(item).color }}
            </v-chip>
          </div>
        </template>

        <template #item.members="{ item }">
          <div class="group-members">
            <template v-if="resolveRow(item).members?.length">
              <v-chip
                v-for="member in resolveRow(item).members"
                :key="member.id ?? member.name"
                size="small"
                class="me-1 mb-1"
                variant="outlined"
                color="primary"
              >
                {{ member.name }}
              </v-chip>
            </template>
            <span v-else class="text-medium-emphasis">Keine Mitglieder</span>
          </div>
        </template>

        <template #item.inRotation="{ item }">
          <v-chip
            v-if="resolveRow(item).inRotation"
            size="small"
            color="success"
            variant="tonal"
            prepend-icon="mdi-sync"
          >
            Aktiv
          </v-chip>
          <v-chip
            v-else
            size="small"
            color="grey"
            variant="tonal"
            prepend-icon="mdi-pause"
          >
            Pausiert
          </v-chip>
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
.groups-table :deep(.v-data-table__td) {
  vertical-align: middle;
}

.groups-table :deep(thead th) {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: rgba(0, 0, 0, 0.54);
}

.group-members {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.groups-table :deep(.v-btn--density-default) {
  min-width: 0;
}

.gap-1 {
  gap: 4px;
}

@media (max-width: 600px) {
  .groups-table :deep(.v-data-table__wrapper) {
    overflow-x: auto;
  }
}
</style>
