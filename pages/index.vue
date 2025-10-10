<script setup lang="ts">
import { computed } from "vue"
import GroupCard from "~/components/GroupCard.vue"

const { data: setup } = await useFetch("/api/setup")

const setupMode = computed(() => !setup.value?.initialized)

// Load current matchings (Job → Group with members)
const {
  data: matchings,
  status: matchingsStatus,
  error: matchingsError,
} = await useFetch("/api/matchings/matchings", {
  default: () => [],
})

// Build simple view models for the UI (Job as top-level)
const cards = computed(() => {
  const list = Array.isArray(matchings.value) ? matchings.value : []
  return list
    .map((m: any) => ({
      id: m.id,
      jobName: m.job?.name ?? "Unbenannt",
      icon: m.job?.icon ?? "🧩",
      description: m.job?.description ?? "",
      groupName: m.group?.name ?? "—",
      color: m.group?.color ?? "#000000",
      members: Array.isArray(m.group?.members)
        ? m.group.members.map((gm: any) => gm.member?.name ?? gm.name ?? "")
        : [],
      rotationPointer: m.job?.rotationPointer ?? 0,
    }))
    .sort((a: any, b: any) => a.rotationPointer - b.rotationPointer)
})

const { data: backgroundSetting } = await useFetch("/api/settings/background", {
  default: () => ({ path: null }),
})

const backgroundUrl = computed(() => {
  const path = backgroundSetting.value?.path
  if (path) return path
  return "/background.png"
})

const bgStyle = computed(() => ({
  backgroundImage: `url('${backgroundUrl.value}')`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
}))
</script>

<template>
  <div
    class="py-8 min-h-full min-w-full flex items-center justify-center"
    :style="bgStyle"
  >
    <template v-if="setupMode">
      <SetupForm />
    </template>

    <template v-else>
      <!-- Background wrapper with soft overlay for readability -->
      <div
        class="relative rounded-2xl overflow-hidden mx-auto p-6 md:p-10 max-w-screen-xl"
      >
        <div
          class="absolute inset-0"
          style="
            background: linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.92),
              rgba(255, 255, 255, 0.88)
            );
          "
        ></div>

        <div class="relative">
          <!-- Header -->
          <header class="mb-8 md:mb-10 px-4 sm:px-6">
            <h1 class="text-3xl md:text-4xl font-semibold leading-tight">
              Ämtliplan
            </h1>
          </header>

          <!-- Loading / Error / Empty states -->
          <div v-if="matchingsStatus === 'pending'" class="py-10 px-4 sm:px-6">
            <v-skeleton-loader type="image, article, article" />
          </div>

          <div
            v-else-if="matchingsError"
            class="py-14 text-center text-red-600"
          >
            {{ matchingsError?.message || "Fehler beim Laden." }}
          </div>

          <div
            v-else-if="cards.length === 0"
            class="py-16 text-center text-gray-500"
          >
            Noch keine Zuordnungen vorhanden. Lege Jobs und Gruppen an und
            erstelle Matchings.
          </div>

          <div
            class="relative jobs-grid grid gap-6 sm:gap-7 md:gap-8"
            :style="{
              '--cols':
                cards.length <= 4
                  ? cards.length || 1
                  : cards.length <= 8
                    ? Math.ceil(cards.length / 2)
                    : Math.min(6, Math.ceil(Math.sqrt(cards.length))),
            }"
          >
            <GroupCard v-for="card in cards" :key="card.id" :c="card" />
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
@media (min-width: 640px) {
  /* sm breakpoint */
  .jobs-grid {
    grid-template-columns: repeat(2, minmax(260px, 1fr));
  }
}

/* Large screens: dynamic columns based on --cols (set inline from cards.length) */
@media (min-width: 1024px) {
  /* lg breakpoint */
  .jobs-grid {
    grid-template-columns: repeat(var(--cols, 3), minmax(260px, 1fr));
  }
}
</style>
