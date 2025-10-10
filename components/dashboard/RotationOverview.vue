<script setup lang="ts">
import { computed } from "vue"
import type { RotationItem } from "~/types/dashboard"

const props = defineProps<{
  items: RotationItem[]
  status: string
  error?: Error | null
}>()

const isLoading = computed(() => props.status === "pending")
</script>

<template>
  <v-card variant="elevated" class="pb-2 pt-2 md:pb-3">
    <v-card-title class="flex items-center pb-2">
      <v-icon icon="mdi-repeat" class="me-3 text-primary" />
      <span class="text-h6 font-weight-medium">Nächste Rotation</span>
    </v-card-title>
    <v-divider />
    <v-card-text>
      <template v-if="isLoading">
        <v-skeleton-loader type="list-item-avatar-two-line@6" />
      </template>
      <template v-else-if="props.error">
        <v-alert type="error" variant="tonal">
          {{
            props.error?.message || "Rotationen konnten nicht geladen werden."
          }}
        </v-alert>
      </template>
      <template v-else-if="!props.items.length">
        <v-alert type="info" variant="tonal">
          Noch keine Zuordnungen vorhanden. Lege Gruppen und Jobs an, um die
          Rotation zu starten.
        </v-alert>
      </template>
      <template v-else>
        <v-list
          density="comfortable"
          class="grid gap-4 p-2 lg:grid-cols-2 xl:grid-cols-3"
        >
          <v-list-item
            v-for="item in props.items"
            :key="item.id"
            class="flex rounded-lg border border-black/10 shadow-sm"
          >
            <template #prepend>
              <v-avatar size="44" color="primary" variant="tonal">
                <v-icon v-if="item.iconType === 'mdi'" :icon="item.jobIcon" />
                <span v-else class="text-h6">{{ item.jobIcon }}</span>
              </v-avatar>
            </template>

            <div
              class="flex flex-col md:flex-row lg:flex-col sm:justify-between gap-1.5 min-w-0 p-4 grow"
            >
              <div class="flex flex-col gap-1">
                <div class="font-semibold text-base truncate">
                  {{ item.jobName }}
                </div>
                <div
                  v-if="item.jobDescription"
                  class="text-medium-emphasis text-sm"
                >
                  {{ item.jobDescription }}
                </div>
              </div>
              <div class="flex gap-3 flex-row md:items-center md:gap-4">
                <div class="flex flex-col gap-1 items-start">
                  <span
                    class="text-xs font-semibold uppercase tracking-wide text-black/60"
                    >Aktuell</span
                  >
                  <v-chip
                    variant="flat"
                    size="small"
                    class="text-white font-weight-medium"
                    :style="{ backgroundColor: item.groupColor }"
                  >
                    {{ item.groupName }}
                  </v-chip>
                </div>
                <v-icon
                  icon="mdi-arrow-right"
                  size="18"
                  class="text-medium-emphasis"
                />
                <div class="flex flex-col gap-1 items-start">
                  <span
                    class="text-xs font-semibold uppercase tracking-wide text-black/60"
                    >nächst.</span
                  >
                  <v-chip
                    variant="flat"
                    size="small"
                    class="text-white font-weight-medium"
                    :style="{
                      backgroundColor: item.nextGroupColor || '#B0BEC5',
                    }"
                  >
                    {{ item.nextGroupName }}
                  </v-chip>
                </div>
              </div>
            </div>
          </v-list-item>
        </v-list>
      </template>
    </v-card-text>
  </v-card>
</template>
