<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

const { data: setup } = await useFetch('/api/setup')

// Show setup form until first admin exists
const setupMode = computed(() => !setup.value?.initialized)

// Load current matchings (Job → Group with members)
const {
  data: matchings,
  status: matchingsStatus,
  error: matchingsError,
} = await useFetch('/api/matchings/matchings', {
  default: () => []
})

// Build simple view models for the UI (Job as top-level)
const cards = computed(() => {
  const list = Array.isArray(matchings.value) ? matchings.value : []
  return list
    .map((m: any) => ({
      id: m.id,
      jobName: m.job?.name ?? 'Unbenannt',
      icon: m.job?.icon ?? '🧩',
      description: m.job?.description ?? '',
      groupName: m.group?.name ?? '—',
      color: m.group?.color ?? '#000000',
      members: Array.isArray(m.group?.members)
        ? m.group.members.map((gm: any) => gm.member?.name ?? gm.name ?? '')
        : []
    }))
    .sort((a: any, b: any) => a.rotationPointer - b.rotationPointer)
})

// --- Background image ---
// Try /newbackground.png first, then fall back to /backgruond.png
const bgUrl = ref<string>('')
async function resolveBackground() {
  try {
    const r = await fetch('newbackground.png', { method: 'HEAD' })
    if (r.ok) { bgUrl.value = 'newbackground.png'; return }
  } catch {}
  try {
    const r2 = await fetch('background.png', { method: 'HEAD' })
    if (r2.ok) { bgUrl.value = 'background.png'; return }
  } catch {}
  bgUrl.value = ''
}

onMounted(resolveBackground)

const bgStyle = computed(() =>
  bgUrl.value
    ? {
        backgroundImage: `url('${bgUrl.value}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }
    : {}
)
</script>

<template>
  <div class="py-8 min-h-full min-w-full flex items-center justify-center" :style="bgStyle">
    <template v-if="setupMode">
      <SetupForm />
    </template>

    <template v-else >
      <!-- Background wrapper with soft overlay for readability -->
      <div class="relative rounded-2xl overflow-hidden mx-auto p-6 md:p-10 max-w-screen-xl">
        <div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.88))"></div>

        <div class="relative">
          <!-- Header -->
          <header class="mb-8 md:mb-10 px-4 sm:px-6">
            <h1 class="text-3xl md:text-4xl font-semibold leading-tight">Ämtliplan</h1>
            <p class="text-gray-700 mt-1">Übersicht aller Jobs mit aktuell zugeteilter Gruppe.</p>
          </header>

          <!-- Loading / Error / Empty states -->
          <div v-if="matchingsStatus === 'pending'" class="py-10 px-4 sm:px-6">
            <v-skeleton-loader type="image, article, article" />
          </div>

          <div v-else-if="matchingsError" class="py-14 text-center text-red-600">
            {{ matchingsError?.message || 'Fehler beim Laden.' }}
          </div>

          <div v-else-if="cards.length === 0" class="py-16 text-center text-gray-500">
            Noch keine Zuordnungen vorhanden. Lege Jobs und Gruppen an und erstelle Matchings.
          </div>

          <!-- Jobs grid (Job is top-level; inside each card: assigned group + members) -->
          <div class="jobs-grid grid gap-6 sm:gap-7 md:gap-8" :style="{ '--cols': (cards.length <= 4 ? (cards.length || 1) : (cards.length <= 8 ? Math.ceil(cards.length / 2) : Math.min(6, Math.ceil(Math.sqrt(cards.length))))) }">
            <article
              v-for="c in cards"
              :key="c.id"
              class="h-64 rounded-2xl border border-gray-200/70 bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col"
            >
              <!-- Job header -->
              <div class="p-4 flex items-start gap-3 grow-0">
                <div class="text-3xl leading-none mt-0.5">{{ c.icon }}</div>
                <div class="min-w-0">
                  <h2 class="font-semibold truncate">{{ c.jobName }}</h2>
                  <p v-if="c.description" class="text-gray-500 text-sm line-clamp-2">{{ c.description }}</p>
                </div>
              </div>

              <v-divider />

              <!-- Assigned group & members -->
              <div class="px-4 pt-3 pb-4 grow overflow-hidden">
                <div class="mb-2 text-xs uppercase tracking-wide text-gray-500">Zugeordnete Gruppe</div>
                <div class="flex items-center gap-2 mb-3">
                  <v-chip :color="c.color" variant="flat" prepend-icon="mdi-account-group-outline">{{ c.groupName }}</v-chip>
                </div>

                <div class="text-xs uppercase tracking-wide text-gray-500 mb-1">Mitglieder</div>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(m, i) in c.members"
                    :key="i"
                    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs text-gray-700 bg-gray-50"
                  >
                    {{ m || '—' }}
                  </span>
                  <span v-if="!c.members?.length" class="text-gray-400 text-xs">Keine Mitglieder</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<style scoped>
/* Mobile: single column (vertical stack) */
.jobs-grid {
  display: grid;
  grid-template-columns: 1fr;
}

/* Tablets: two columns */
@media (min-width: 640px) { /* sm breakpoint */
  .jobs-grid {
    grid-template-columns: repeat(2, minmax(260px, 1fr));
  }
}

/* Large screens: dynamic columns based on --cols (set inline from cards.length) */
@media (min-width: 1024px) { /* lg breakpoint */
  .jobs-grid {
    grid-template-columns: repeat(var(--cols, 3), minmax(260px, 1fr));
  }
}
</style>