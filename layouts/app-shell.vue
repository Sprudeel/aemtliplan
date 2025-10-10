<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { useDisplay } from "vuetify"
import { useSnackbar } from "~/composables/useSnackbar"

interface MenuItem {
  title: string
  icon: string
  to?: string | null
}

const route = useRoute()
const display = useDisplay()
const { snackbar, close, open: openSnackbar } = useSnackbar()
const userState = useState<{
  id: number
  name: string
  email: string
  role: string
} | null>("auth-user", () => null)
const authInitialized = useState<boolean>("auth-user-initialized", () => false)
const loggingOut = ref(false)

const menuItems: MenuItem[] = [
  { title: "Dashboard", icon: "mdi-view-dashboard-outline", to: "/dashboard" },
  { title: "Planner", icon: "mdi-timetable", to: "/plan" },
  { title: "Aufgaben", icon: "mdi-list-box-outline", to: "/jobs" },
  { title: "Gruppen", icon: "mdi-account-group-outline", to: "/groups" },
  { title: "Nutzer", icon: "mdi-account-key", to: "/users" },
  { title: "Einstellungen", icon: "mdi-cog-outline", to: "/settings" },
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
  const current = menuItems.find(
    (item) => item.to && route.path.startsWith(item.to),
  )
  return current?.title ?? "Ämtliplan"
})

function isActive(item: MenuItem) {
  return Boolean(item.to && route.path.startsWith(item.to))
}

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await $fetch("/api/auth/logout", { method: "POST" })
    userState.value = null
    authInitialized.value = false
    await navigateTo("/login", { replace: true })
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage || "Abmelden fehlgeschlagen.",
      "error",
    )
  } finally {
    loggingOut.value = false
  }
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
        <v-img
          src="/logo2.png"
          alt="Ämtliplan"
          width=""
          height=""
          class="mr-3 rounded"
          cover
        />
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

      <v-divider class="my-4" />

      <div class="flex flex-col gap-2 px-2 py-0">
        <div class="flex items-center gap-3">
          <v-avatar size="36" color="primary" variant="tonal">
            <v-icon icon="mdi-account-circle" />
          </v-avatar>
          <div class="flex flex-col">
            <div class="font-weight-bold text-md">
              {{ userState?.name ?? "Unbekannter Nutzer" }}
            </div>
            <div class="text-xs text-medium-emphasis">
              {{ userState?.role === "ADMIN" ? "Administrator" : "Mitglied" }}
            </div>
          </div>
        </div>
        <v-btn
          block
          variant="text"
          color="primary"
          prepend-icon="mdi-logout"
          :loading="loggingOut"
          @click="handleLogout"
        >
          Abmelden
        </v-btn>
      </div>
    </v-navigation-drawer>

    <v-main class="bg-grey-lighten-4">
      <v-app-bar app flat color="transparent" class="px-4">
        <v-app-bar-nav-icon class="mr-2" @click="drawer = !drawer" />
        <v-toolbar-title class="text-h6 font-weight-medium">{{
          currentTitle
        }}</v-toolbar-title>
        <v-spacer />
        <v-tooltip
          text="Hier kannst du den Ämtliplan ansehen"
          location="bottom"
        >
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
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="bottom right"
      multi-line
      rounded="lg"
    >
      <div class="flex items-center gap-3">
        <v-icon
          :icon="
            snackbar.color === 'success'
              ? 'mdi-check-circle'
              : snackbar.color === 'error'
                ? 'mdi-alert-circle'
                : snackbar.color === 'warning'
                  ? 'mdi-alert'
                  : 'mdi-information'
          "
        />
        <span>{{ snackbar.message }}</span>
        <v-spacer />
        <v-btn variant="text" color="white" size="small" @click="close"
          >Schliessen</v-btn
        >
      </div>
    </v-snackbar>
  </v-layout>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.app-shell__drawer {
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}

.app-shell__menu {
  flex-grow: 1;
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
