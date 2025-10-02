<script setup lang="ts">
import { computed } from 'vue'
import { Cron } from 'croner'

interface RotationItem {
  id: number | string
  jobId?: number
  jobName: string
  jobIcon: string
  iconType: 'mdi' | 'text'
  jobDescription: string
  rotationPointer: number
  groupName: string
  groupColor: string
  members: string[]
  nextGroupName?: string
  nextGroupColor?: string
  nextMembers?: string[]
}

definePageMeta({ layout: 'app-shell' })

const runtimeConfig = useRuntimeConfig()
const rotationCron = String(runtimeConfig.public?.rotationCron ?? '')

const { data: groupsRaw } = await useFetch('/api/groups/groups', {
  default: () => [],
})

const {
  data: matchingsRaw,
  status: matchingsStatus,
  error: matchingsError,
} = await useFetch('/api/matchings/matchings', {
  default: () => [],
})

const sortedGroups = computed(() => {
  const raw = groupsRaw.value
  if (!Array.isArray(raw)) return []
  return [...raw].sort((a: any, b: any) => (a?.rotationIndex ?? 0) - (b?.rotationIndex ?? 0))
})

const pointerToGroup = computed(() => {
  const map = new Map<number, any>()
  sortedGroups.value.forEach((group: any, index: number) => {
    const key = typeof group?.rotationIndex === 'number' ? group.rotationIndex : index
    map.set(key, group)
  })
  return map
})

const currentRotation = computed<RotationItem[]>(() => {
  const raw = matchingsRaw.value
  if (!Array.isArray(raw)) return []
  return raw
    .map((record: any) => {
      const job = record?.job ?? {}
      const group = record?.group ?? {}
      const icon = typeof job.icon === 'string' && job.icon.length ? job.icon : 'mdi-clipboard-text-outline'
      const iconType: 'mdi' | 'text' = icon.startsWith('mdi-') ? 'mdi' : 'text'
      return {
        id: record?.id ?? `${job.id ?? ''}-${group.id ?? ''}`,
        jobId: job?.id,
        jobName: job?.name ?? 'Unbenanntes Ämtli',
        jobIcon: icon,
        iconType,
        jobDescription: job?.description ?? '',
        rotationPointer: job?.rotationPointer ?? 0,
        groupName: group?.name ?? '—',
        groupColor: group?.color ?? '#B0BEC5',
        members: Array.isArray(group?.members)
          ? group.members.map((m: any) => m?.member?.name ?? m?.name ?? '').filter(Boolean)
          : [],
      }
    })
    .sort((a, b) => a.rotationPointer - b.rotationPointer)
})

const rotationEntries = computed<RotationItem[]>(() => {
  const ringSize = pointerToGroup.value.size
  return currentRotation.value.map((item) => {
    const nextPointer = ringSize ? (item.rotationPointer + 1) % ringSize : null
    const nextGroup = typeof nextPointer === 'number' ? pointerToGroup.value.get(nextPointer) : null
    return {
      ...item,
      nextGroupName: nextGroup?.name ?? '—',
      nextGroupColor: nextGroup?.color ?? '#B0BEC5',
      nextMembers: Array.isArray(nextGroup?.members)
        ? nextGroup.members.map((m: any) => m?.member?.name ?? m?.name ?? '').filter(Boolean)
        : [],
    }
  })
})

const rotationSummary = computed(() => ({
  totalJobs: currentRotation.value.length,
  totalGroups: pointerToGroup.value.size,
}))

const nextRotationRun = computed<Date | null>(() => {
  if (!rotationCron) return null
  try {
    const cron = new Cron(rotationCron, { maxRuns: 1, paused: true })
    const next = cron.nextRun()
    cron.stop()
    return next ?? null
  } catch (e) {
    console.warn('Invalid rotation cron expression', e)
    return null
  }
})

const detailedFormatter = new Intl.DateTimeFormat('de-CH', {
  dateStyle: 'full',
  timeStyle: 'short',
})

const compactFormatter = new Intl.DateTimeFormat('de-CH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const nextRotationLabel = computed(() => {
  if (!nextRotationRun.value) return 'Noch kein Zeitplan festgelegt'
  return detailedFormatter.format(nextRotationRun.value)
})

const nextRotationCountdown = computed(() => {
  if (!nextRotationRun.value) return null
  const diffMs = nextRotationRun.value.getTime() - Date.now()
  if (diffMs <= 0) return 'gleich fällig'
  const minutes = Math.floor(diffMs / (1000 * 60))
  const days = Math.floor(minutes / (60 * 24))
  const hours = Math.floor((minutes % (60 * 24)) / 60)
  const mins = minutes % 60
  const segments: string[] = []
  if (days) segments.push(`${days} Tag${days === 1 ? '' : 'e'}`)
  if (hours) segments.push(`${hours} Std.`)
  if (!days && mins) segments.push(`${mins} Min.`)
  return segments.length ? segments.join(' ') : 'unter 1 Minute'
})

const rotationCronLabel = computed(() => (rotationCron ? rotationCron : 'nicht definiert'))

const generatedAt = new Date()
const lastUpdatedLabel = compactFormatter.format(generatedAt)
</script>

<template>
  <div class="dashboard-page">
    <v-row class="gy-6">
      <v-col cols="12" lg="4">
        <v-card class="h-100 pa-5" elevation="2">
          <div class="d-flex align-center">
            <v-avatar size="46" color="primary" variant="tonal">
              <v-icon icon="mdi-calendar-clock" size="28" />
            </v-avatar>
            <div class="ms-4">
              <div class="text-subtitle-1 font-weight-medium">Nächste Rotation</div>
              <div class="text-body-2 text-medium-emphasis">{{ nextRotationLabel }}</div>
            </div>
          </div>
          <v-chip
            class="mt-4"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-timer-cog-outline"
          >
            {{ rotationCronLabel }}
          </v-chip>
          <div v-if="nextRotationCountdown" class="text-caption text-medium-emphasis mt-3">
            In {{ nextRotationCountdown }}
          </div>
          <div v-else class="text-caption text-error mt-3">
            Cron-Plan konnte nicht ermittelt werden.
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" lg="8">
        <v-card class="h-100 pa-5" elevation="2">
          <div class="d-flex align-center">
            <v-avatar size="46" color="secondary" variant="tonal">
              <v-icon icon="mdi-clipboard-pulse-outline" size="26" />
            </v-avatar>
            <div class="ms-4">
              <div class="text-subtitle-1 font-weight-medium">Rotation Snapshot</div>
              <div class="text-body-2 text-medium-emphasis">Status der aktuellen Ämtli Zuordnung</div>
            </div>
          </div>
          <div class="d-flex flex-wrap gap-4 mt-5">
            <v-sheet rounded="lg" color="primary" variant="tonal" class="pa-4 flex-grow-1 min-width-0">
              <div class="text-caption text-medium-emphasis mb-1">Aktive Jobs</div>
              <div class="text-h5 font-weight-medium">{{ rotationSummary.totalJobs }}</div>
            </v-sheet>
            <v-sheet rounded="lg" color="secondary" variant="tonal" class="pa-4 flex-grow-1 min-width-0">
              <div class="text-caption text-medium-emphasis mb-1">Verfügbare Gruppen</div>
              <div class="text-h5 font-weight-medium">{{ rotationSummary.totalGroups }}</div>
            </v-sheet>
          </div>
          <div class="text-caption text-medium-emphasis mt-6">
            Aktualisiert: {{ lastUpdatedLabel }}
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="gy-6 mt-1">
      <v-col cols="12">
        <v-card variant="outlined" class="rotation-card">
          <v-card-title class="d-flex align-center pb-2">
            <v-icon icon="mdi-repeat" class="me-3 text-primary" />
            <span class="text-h6 font-weight-medium">Rotation Übersicht</span>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <template v-if="matchingsStatus === 'pending'">
              <v-skeleton-loader type="list-item-avatar-two-line@6" />
            </template>
            <template v-else-if="matchingsError">
              <v-alert type="error" variant="tonal">
                {{ matchingsError?.message || 'Rotationen konnten nicht geladen werden.' }}
              </v-alert>
            </template>
            <template v-else-if="!rotationEntries.length">
              <v-alert type="info" variant="tonal">
                Noch keine Zuordnungen vorhanden. Lege Gruppen und Jobs an, um die Rotation zu starten.
              </v-alert>
            </template>
            <template v-else>
              <v-list density="comfortable" class="rotation-list">
                <v-list-item
                  v-for="item in rotationEntries"
                  :key="item.id"
                  class="rotation-list-item"
                >
                  <template #prepend>
                    <v-avatar size="44" color="primary" variant="tonal">
                      <v-icon v-if="item.iconType === 'mdi'" :icon="item.jobIcon" />
                      <span v-else class="text-h6">{{ item.jobIcon }}</span>
                    </v-avatar>
                  </template>

                  <div class="rotation-item__content">
                    <div class="rotation-item__header">
                      <div class="rotation-item__title">{{ item.jobName }}</div>
                      <div v-if="item.jobDescription" class="rotation-item__description text-medium-emphasis">
                        {{ item.jobDescription }}
                      </div>
                    </div>
                    <div class="rotation-members text-medium-emphasis">
                      <div>
                        <span class="rotation-members__label">Aktuell:</span>
                        <span>
                          <template v-if="item.members.length">
                            {{ item.members.join(', ') }}
                          </template>
                          <template v-else>
                            Keine Mitglieder eingetragen
                          </template>
                        </span>
                      </div>
                      <div>
                        <span class="rotation-members__label">Als nächstes:</span>
                        <span>
                          <template v-if="item.nextMembers?.length">
                            {{ item.nextMembers.join(', ') }}
                          </template>
                          <template v-else>
                            Keine Mitglieder eingetragen
                          </template>
                        </span>
                      </div>
                    </div>
                  </div>
                  <template #append>
                    <div class="rotation-flow">
                      <div class="rotation-flow__stage">
                        <span class="rotation-flow__label">Aktuell</span>
                        <v-chip
                          variant="flat"
                          size="small"
                          class="text-white font-weight-medium"
                          :style="{ backgroundColor: item.groupColor }"
                        >
                          {{ item.groupName }}
                        </v-chip>
                      </div>
                      <v-icon icon="mdi-arrow-right" size="18" class="rotation-flow__arrow text-medium-emphasis" />
                      <div class="rotation-flow__stage">
                        <span class="rotation-flow__label">Als nächstes</span>
                        <v-chip
                          variant="flat"
                          size="small"
                          class="text-white font-weight-medium"
                          :style="{ backgroundColor: item.nextGroupColor || '#B0BEC5' }"
                        >
                          {{ item.nextGroupName }}
                        </v-chip>
                      </div>
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </template>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.rotation-card {
  padding-bottom: 8px;
}

.rotation-list {
  padding-block: 4px;
}

.rotation-list-item {
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.rotation-list-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.rotation-item__content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.rotation-item__header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rotation-item__title {
  font-weight: 600;
  font-size: 1rem;
  word-break: break-word;
}

.rotation-item__description {
  font-size: 0.85rem;
}

.rotation-members {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.85rem;
}

.rotation-members__label {
  font-weight: 600;
  margin-right: 6px;
}

.rotation-flow {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 220px;
}

.rotation-flow__stage {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.rotation-flow__label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(0, 0, 0, 0.54);
}

.rotation-flow__arrow {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .rotation-flow {
    flex-direction: column;
    align-items: flex-start;
    max-width: none;
  }

  .rotation-flow__arrow {
    transform: rotate(90deg);
  }
}
</style>