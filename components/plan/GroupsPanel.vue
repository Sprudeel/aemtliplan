<script setup lang="ts">
import { computed } from "vue"
import type { GroupRecord } from "~/types/groups"

const props = defineProps<{
  groups: GroupRecord[]
  assignedGroupIds: number[]
  unassignedCount: number
  inactiveCount: number
  isLoading: boolean
  error?: Error | null
  draggedGroupId?: number | null
}>()

const emit = defineEmits<{
  (event: "start-group-drag", groupId: number, dragEvent: DragEvent): void
  (event: "end-drag"): void
}>()

const assignedSet = computed(() => new Set(props.assignedGroupIds))
</script>

<template>
  <v-card class="pa-5 groups-panel" elevation="2">
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h2 class="text-h6 font-weight-medium mb-1">Gruppen</h2>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Ziehe Gruppen auf Ämtli, um sie zuzuweisen.
        </p>
      </div>
      <v-chip variant="tonal" size="small">{{ groups.length }} Gruppen </v-chip>
    </div>
    <v-divider />

    <div class="groups-container mt-4">
      <template v-if="isLoading">
        <v-skeleton-loader type="list-item@6" />
      </template>
      <template v-else-if="error">
        <v-alert type="error" variant="tonal">
          {{ error?.message || "Gruppen konnten nicht geladen werden." }}
        </v-alert>
      </template>
      <template v-else-if="!groups.length">
        <v-alert type="info" variant="tonal">
          <template v-if="inactiveCount">
            Alle vorhandenen Gruppen sind derzeit aus dem Rotationszyklus
            genommen.
          </template>
          <template v-else>
            Noch keine Gruppen vorhanden. Lege Gruppen an, um sie zuzuweisen.
          </template>
        </v-alert>
        <div
          v-if="inactiveCount"
          class="text-caption text-medium-emphasis mt-3"
        >
          {{ inactiveCount }} Gruppen sind derzeit nicht im Rotationszyklus.
        </div>
      </template>
      <template v-else>
        <div class="group-grid">
          <div
            v-for="group in groups"
            :key="group.id"
            class="group-card"
            :class="{
              'group-card--assigned': assignedSet.has(group.id),
              'group-card--drag-source': draggedGroupId === group.id,
            }"
            draggable="true"
            @dragstart="emit('start-group-drag', group.id, $event)"
            @dragend="emit('end-drag')"
          >
            <div
              class="group-card__color"
              :style="{ backgroundColor: group.color }"
            />
            <div class="group-card__body">
              <div class="group-card__title">{{ group.name }}</div>
              <div class="group-card__members">
                {{ group.members.length }} Mitglieder
              </div>
            </div>
            <v-icon
              v-if="assignedSet.has(group.id)"
              icon="mdi-link-variant"
              size="18"
              class="group-card__status"
            />
          </div>
        </div>
        <div
          v-if="unassignedCount"
          class="text-caption text-medium-emphasis mt-3"
        >
          {{ unassignedCount }} Gruppen sind noch nicht zugewiesen.
        </div>
        <div
          v-if="inactiveCount"
          class="text-caption text-medium-emphasis mt-1"
        >
          {{ inactiveCount }} Gruppen sind derzeit nicht im Rotationszyklus.
        </div>
      </template>
    </div>
  </v-card>
</template>

<style scoped>
.groups-container {
  min-height: 160px;
}

.group-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.group-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  align-items: center;
  background: white;
  cursor: grab;
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.group-card:active {
  cursor: grabbing;
}

.group-card--drag-source {
  opacity: 0.55;
}

.group-card:hover {
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1);
  transform: translateY(-2px);
}

.group-card--assigned {
  border-color: rgba(33, 150, 243, 0.45);
}

.group-card__color {
  width: 12px;
  height: 100%;
  border-radius: 8px;
}

.group-card__body {
  flex: 1;
}

.group-card__title {
  font-weight: 600;
}

.group-card__members {
  font-size: 0.82rem;
  color: rgba(0, 0, 0, 0.54);
}

.group-card__status {
  color: rgba(33, 150, 243, 0.85);
}

@media (min-width: 1200px) {
  .groups-container {
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    padding-right: 4px;
    scrollbar-gutter: stable both-edges;
  }
}
</style>
