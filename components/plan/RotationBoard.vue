<script setup lang="ts">
import type { GroupRecord } from "~/types/groups"
import type { JobRecord } from "~/types/jobs"

interface RotationItem {
  job: JobRecord
  group: GroupRecord | null
}

defineProps<{
  items: RotationItem[]
  isLoading: boolean
  jobsError?: Error | null
  matchingsError?: Error | null
  jobHoverId: number | null
  rotationHoverIndex: number | null
  rotationSaving: boolean
}>()

const emit = defineEmits<{
  (event: "move-item", from: number, to: number): void
  (event: "start-job-drag", jobId: number, dragEvent: DragEvent): void
  (event: "drag-end"): void
  (event: "slot-drag-over", index: number, jobId?: number): void
  (event: "slot-drag-leave", index: number, jobId?: number): void
  (event: "slot-drop", index: number, jobId: number): void
  (event: "append-drop", index: number): void
  (event: "clear-assignment", jobId: number): void
  (event: "open-menu", jobId: number, triggerEvent: Event): void
}>()
</script>

<template>
  <v-card class="pa-4 rotation-board" elevation="2">
    <div
      class="d-flex align-start align-md-center justify-space-between flex-column flex-md-row gap-2 mb-3"
    >
      <div>
        <h2 class="text-h6 font-weight-medium mb-1">Ämtli & Rotation</h2>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Ziehe Gruppen auf Ämtli und ordne die Reihenfolge direkt hier.
        </p>
      </div>
      <div class="rotation-meta d-flex align-center gap-2">
        <v-chip variant="tonal" size="small" prepend-icon="mdi-clipboard-check">
          {{ items.length }} Ämtli
        </v-chip>
        <div
          class="rotation-meta__direction text-caption text-medium-emphasis d-flex align-center gap-1"
        >
          <span>Rotation</span>
          <v-icon icon="mdi-arrow-down-bold" size="16" class="d-md-none" />
          <v-icon
            icon="mdi-arrow-right-bold"
            size="16"
            class="d-none d-md-inline-flex"
          />
        </div>
      </div>
    </div>
    <v-divider />

    <div class="jobs-container mt-3">
      <template v-if="isLoading">
        <v-skeleton-loader type="list-item-avatar-three-line@4" />
      </template>
      <template v-else-if="jobsError">
        <v-alert type="error" variant="tonal">
          {{ jobsError?.message || "Ämtli konnten nicht geladen werden." }}
        </v-alert>
      </template>
      <template v-else-if="matchingsError">
        <v-alert type="error" variant="tonal">
          {{
            matchingsError?.message || "Rotation konnte nicht geladen werden."
          }}
        </v-alert>
      </template>
      <template v-else-if="!items.length">
        <v-alert type="info" variant="tonal">
          Noch keine Ämtli vorhanden. Lege zuerst Ämtli an.
        </v-alert>
      </template>
      <template v-else>
        <div
          class="rotation-grid"
          :class="{ 'rotation-grid--saving': rotationSaving }"
        >
          <div
            v-for="(item, index) in items"
            :key="item.job.id"
            class="rotation-slot"
            :class="{
              'rotation-slot--hover': rotationHoverIndex === index,
            }"
          >
            <div class="rotation-slot__header">
              <span class="rotation-slot__label">Platz {{ index + 1 }}</span>
              <div class="rotation-slot__actions">
                <v-btn
                  size="x-small"
                  variant="text"
                  icon="mdi-chevron-up"
                  :disabled="index === 0"
                  @click.stop="emit('move-item', index, index - 1)"
                />
                <v-btn
                  size="x-small"
                  variant="text"
                  icon="mdi-chevron-down"
                  :disabled="index === items.length - 1"
                  @click.stop="emit('move-item', index, index + 1)"
                />
              </div>
            </div>
            <div
              class="rotation-slot__body"
              :class="{
                'rotation-slot__body--group-hover': jobHoverId === item.job.id,
              }"
              @dragover.prevent="emit('slot-drag-over', index, item.job.id)"
              @dragleave="emit('slot-drag-leave', index, item.job.id)"
              @drop.prevent="emit('slot-drop', index, item.job.id)"
            >
              <div
                class="rotation-job"
                draggable="true"
                @dragstart="emit('start-job-drag', item.job.id, $event)"
                @dragend="emit('drag-end')"
              >
                <div class="job-card__header">
                  <div class="job-card__icon">
                    <template v-if="item.job.icon?.startsWith('mdi-')">
                      <v-icon :icon="item.job.icon" size="22" />
                    </template>
                    <template v-else-if="item.job.icon">
                      <span class="job-card__emoji">{{ item.job.icon }}</span>
                    </template>
                    <template v-else>
                      <v-icon icon="mdi-clipboard-outline" size="22" />
                    </template>
                  </div>
                  <div class="job-card__meta">
                    <div class="job-card__title">{{ item.job.name }}</div>
                    <div class="job-card__description text-medium-emphasis">
                      {{
                        item.job.description || "Keine Beschreibung hinterlegt."
                      }}
                    </div>
                  </div>
                  <v-chip
                    size="x-small"
                    variant="tonal"
                    class="ms-auto"
                    prepend-icon="mdi-sync"
                    >#{{ index + 1 }}</v-chip
                  >
                </div>
                <v-divider class="my-2" />
                <div class="job-card__assignment">
                  <template v-if="item.group">
                    <div
                      class="job-card__group"
                      :style="{ borderColor: item.group.color }"
                    >
                      <div
                        class="job-card__group-color"
                        :style="{ backgroundColor: item.group.color }"
                      />
                      <div>
                        <div class="font-weight-medium">
                          {{ item.group.name }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ item.group.members.length }} Personen im Team
                        </div>
                      </div>
                    </div>
                    <div class="d-flex justify-end mt-2">
                      <v-btn
                        size="x-small"
                        variant="text"
                        color="error"
                        prepend-icon="mdi-link-off"
                        @click="emit('clear-assignment', item.job.id)"
                      >
                        Zuweisung lösen
                      </v-btn>
                    </div>
                  </template>
                  <template v-else>
                    <div
                      class="job-card__empty text-medium-emphasis"
                      role="button"
                      tabindex="0"
                      aria-label="Gruppe auswählen"
                      @click="emit('open-menu', item.job.id, $event)"
                      @keydown.enter.prevent="
                        emit('open-menu', item.job.id, $event)
                      "
                      @keydown.space.prevent="
                        emit('open-menu', item.job.id, $event)
                      "
                    >
                      <span>Gruppe zuweisen</span>
                      <v-icon
                        icon="mdi-menu-down"
                        size="16"
                        class="text-medium-emphasis"
                      />
                    </div>
                  </template>
                </div>
              </div>
            </div>
            <div
              v-if="index < items.length - 1"
              class="rotation-slot__direction"
            >
              <v-icon
                icon="mdi-arrow-down-bold"
                size="18"
                class="d-inline-flex d-md-none"
              />
              <v-icon
                icon="mdi-arrow-right-bold"
                size="18"
                class="d-none d-md-inline-flex"
              />
            </div>
          </div>
          <div
            class="rotation-slot rotation-slot--append"
            :class="{
              'rotation-slot--hover': rotationHoverIndex === items.length,
            }"
          >
            <div class="rotation-slot__header">
              <span class="rotation-slot__label">Am Ende</span>
            </div>
            <div
              class="rotation-slot__body rotation-slot__body--empty"
              @dragover.prevent="emit('slot-drag-over', items.length)"
              @dragleave="emit('slot-drag-leave', items.length)"
              @drop.prevent="emit('append-drop', items.length)"
            >
              <v-icon icon="mdi-plus" class="text-medium-emphasis" />
              <span class="text-caption"
                >Hierhin ziehen, um ans Ende zu setzen</span
              >
            </div>
            <div
              class="rotation-slot__direction rotation-slot__direction--loop"
            >
              <v-icon
                icon="mdi-arrow-up-bold"
                size="18"
                class="d-inline-flex d-md-none"
              />
              <v-icon
                icon="mdi-arrow-top-right"
                size="18"
                class="d-none d-md-inline-flex"
              />
            </div>
          </div>
        </div>
        <div v-if="rotationSaving" class="rotation-saving mt-2">
          <v-progress-linear indeterminate color="primary" rounded height="4" />
        </div>
      </template>
    </div>
  </v-card>
</template>

<style scoped>
.jobs-container {
  min-height: 110px;
}

.rotation-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  align-items: start;
}

@media (min-width: 1280px) {
  .rotation-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1920px) {
  .rotation-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.rotation-grid--saving {
  opacity: 0.85;
  pointer-events: none;
}

.rotation-slot {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.96);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  position: relative;
}

.rotation-slot--hover {
  border-color: rgba(33, 150, 243, 0.6);
  box-shadow: 0 6px 18px rgba(33, 150, 243, 0.12);
}

.rotation-slot__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rotation-slot__label {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.rotation-slot__actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.rotation-slot__body {
  margin-top: 12px;
  display: flex;
  flex-direction: row;
  border-radius: 12px;
  border: 1px solid transparent;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.rotation-slot__body--group-hover {
  border-color: rgba(33, 150, 243, 0.45);
  background: rgba(33, 150, 243, 0.08);
}

.rotation-job {
  padding: 12px;
  border-radius: 12px;
  cursor: grab;
}

.rotation-job:active {
  cursor: grabbing;
}

.job-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.job-card__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(33, 150, 243, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.job-card__emoji {
  font-size: 22px;
}

.job-card__meta {
  flex: 1;
  min-width: 0;
}

.job-card__title {
  font-weight: 600;
  font-size: 0.95rem;
}

.job-card__description {
  font-size: 0.8rem;
  margin-top: 1px;
  line-height: 1.3;
}

.job-card__assignment {
  min-height: 72px;
}

.job-card__group {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  background: rgba(255, 255, 255, 0.8);
}

.job-card__group-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.job-card__empty {
  border: 1px dashed rgba(33, 150, 243, 0.4);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.job-card__empty:hover,
.job-card__empty:focus-visible {
  background: rgba(33, 150, 243, 0.08);
  border-color: rgba(33, 150, 243, 0.6);
}

.rotation-slot__body--empty {
  min-height: 96px;
  border: 1px dashed rgba(33, 150, 243, 0.4);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(0, 0, 0, 0.54);
}

.rotation-slot__direction {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.45);
}

.rotation-slot__direction--loop {
  margin-top: 8px;
}

@media (min-width: 960px) {
  .rotation-slot__direction {
    position: absolute;
    top: 50%;
    right: -14px;
    transform: translateY(-50%);
    margin-top: 0;
  }

  .rotation-slot__direction--loop {
    position: absolute;
    top: -10px;
    right: -6px;
    transform: none;
    margin-top: 0;
  }
}

.rotation-meta__direction {
  padding: 4px 10px;
  border: 1px dashed rgba(33, 150, 243, 0.4);
  border-radius: 999px;
  background: rgba(33, 150, 243, 0.08);
}

.rotation-saving {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
