<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'

interface MenuItem {
  title: string
  icon: string
  to?: string | null
}

const route = useRoute()
const display = useDisplay()

const menuItems: MenuItem[] = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard-outline', to: '/dashboard' },
  { title: 'Planner', icon: 'mdi-timetable', to: '/plan' },
  { title: 'Aufgaben', icon: 'mdi-list-box-outline', to: '/jobs' },
  { title: 'Gruppen', icon: 'mdi-account-group-outline', to: '/groups' },
  { title: 'Nutzer', icon: 'mdi-account-key', to: '/users' },
  { title: 'Einstellungen', icon: 'mdi-cog-outline', to: '/settings' },
]

const isDesktop = computed(() => display.mdAndUp.value)
const drawer = ref(isDesktop.value)

watch(
  () => display.mdAndUp.value,
  (val) => {
    drawer.value = val
  },
)

const currentTitle = computed(() => {
  const current = menuItems.find((item) => item.to && route.path.startsWith(item.to))
  return current?.title ?? 'Ämtliplan'
})

function isActive(item: MenuItem) {
  return Boolean(item.to && route.path.startsWith(item.to))
}
</script>

<template>
  <v-layout class="app-shell">
    <v-navigation-drawer
      app
      v-model="drawer"
      class="py-6 px-3 app-shell__drawer"
      :temporary="!isDesktop"
      elevation="2"
      width="260"
    >
      <div class="m-4 px-2">
        <v-img src="/logo2.png" alt="Ämtliplan" width="" height="" class="mr-3 rounded" cover />
      </div>

      <v-divider class="mb-4" />

      <v-list nav density="comfortable" class="app-shell__menu">
        <v-list-item
          v-for="item in menuItems"
          :key="item.title"
          :title="item.title"
          :prepend-icon="item.icon"
          :to="item.to ?? undefined"
          :nuxt="Boolean(item.to)"
          :disabled="!item.to"
          rounded="lg"
          color="primary"
          :class="[{ 'app-shell__menu-item--active': isActive(item) }]"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main class="bg-grey-lighten-4">
      <v-app-bar
        app
        flat
        color="transparent"
        class="px-4"
      >
        <v-app-bar-nav-icon
          class="mr-2"
          @click="drawer = !drawer"
        />
        <v-toolbar-title class="text-h6 font-weight-medium">{{ currentTitle }}</v-toolbar-title>
        <v-spacer />
        <v-tooltip text="Hier kannst du den Ämtliplan ansehen" location="bottom">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon="mdi-open-in-new"
              variant="text"
              href="/"
              target="_blank"
              rel="noopener"
            />
          </template>
        </v-tooltip>
      </v-app-bar>

      <div class="app-shell__content">
        <slot />
      </div>
    </v-main>
  </v-layout>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.app-shell__drawer {
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.app-shell__menu :deep(.v-list-item) {
  transition: background-color 0.2s ease;
}

.app-shell__menu-item--active :deep(.v-list-item__overlay) {
  opacity: 0.12;
}

.app-shell__content {
  padding: 24px;
}

@media (max-width: 959px) {
  .app-shell__content {
    padding: 16px;
  }
}
</style>
