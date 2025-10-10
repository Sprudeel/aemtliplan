<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue"
import { useSnackbar } from "~/composables/useSnackbar"
import SearchSummaryBar from "~/components/common/SearchSummaryBar.vue"
import type { CreateUserPayload, UserRecord, UserRole } from "~/types/users"

definePageMeta({ layout: "app-shell", middleware: "auth" })

const search = ref("")
const createDialog = ref(false)
const deleteDialog = ref(false)
const isSubmitting = ref(false)
const userToDelete = ref<UserRecord | null>(null)
const formRef = ref<any>(null)

const form = reactive<CreateUserPayload>({
  name: "",
  email: "",
  password: "",
  role: "USER",
})

const { open: openSnackbar } = useSnackbar()

const roleOptions = [
  { title: "Administrator", value: "ADMIN" as UserRole },
  { title: "Mitglied", value: "USER" as UserRole },
]

const headers = [
  { title: "Name", key: "name" },
  { title: "E-Mail", key: "email" },
  { title: "Rolle", key: "roleLabel", sortable: false },
  { title: "Erstellt am", key: "createdAtFormatted" },
  { title: "Aktionen", key: "actions", sortable: false },
]

const {
  data: users,
  status: usersStatus,
  error: usersError,
  refresh: refreshUsers,
} = await useFetch<UserRecord[]>("/api/users/users", {
  default: () => [],
})

const totalUsers = computed(() =>
  Array.isArray(users.value) ? users.value.length : 0,
)
const adminCount = computed(() =>
  Array.isArray(users.value)
    ? users.value.filter((user) => user.role === "ADMIN").length
    : 0,
)

const filteredUsers = computed(() => {
  const list = Array.isArray(users.value) ? users.value : []
  const term = search.value.trim().toLowerCase()
  if (!term) return list
  return list.filter(
    (user) =>
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term),
  )
})

const tableItems = computed(() =>
  filteredUsers.value.map((user) => {
    const createdAt = new Date(user.createdAt)
    return {
      ...user,
      roleLabel: user.role === "ADMIN" ? "Admin" : "Nutzer",
      roleColor: user.role === "ADMIN" ? "red" : "blue",
      createdAtFormatted: isNaN(createdAt.getTime())
        ? "—"
        : createdAt.toLocaleDateString("de-CH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
    }
  }),
)

function openCreateDialog() {
  resetForm()
  createDialog.value = true
}

function resetForm() {
  form.name = ""
  form.email = ""
  form.password = ""
  form.role = "USER"
  formRef.value?.resetValidation?.()
}

function openDeleteDialog(user: UserRecord) {
  userToDelete.value = user
  deleteDialog.value = true
}

async function handleCreate() {
  if (isSubmitting.value) return
  const validation = await formRef.value?.validate?.()
  if (validation && !validation.valid) return

  isSubmitting.value = true
  try {
    await $fetch("/api/auth/register", {
      method: "POST",
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      },
    })
    await refreshUsers()
    createDialog.value = false
    openSnackbar("Nutzer wurde erstellt.")
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage || "Nutzer konnte nicht erstellt werden.",
      "error",
    )
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete() {
  if (!userToDelete.value || isSubmitting.value) return

  isSubmitting.value = true
  try {
    await $fetch("/api/users/user", {
      method: "DELETE",
      body: { id: userToDelete.value.id },
    })
    await refreshUsers()
    deleteDialog.value = false
    openSnackbar("Nutzer wurde gelöscht.")
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage || "Nutzer konnte nicht gelöscht werden.",
      "error",
    )
  } finally {
    isSubmitting.value = false
  }
}

watch(createDialog, (open) => {
  if (!open) resetForm()
})

watch(deleteDialog, (open) => {
  if (!open) userToDelete.value = null
})
</script>

<template>
  <div class="users-page">
    <v-row class="gy-6">
      <v-col cols="12">
        <v-card class="pa-6" elevation="2">
          <div
            class="d-flex flex-column flex-sm-row justify-space-between align-sm-center gap-4"
          >
            <div>
              <h1 class="text-h5 font-weight-semibold mb-1">
                Nutzerverwaltung
              </h1>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Lege neue Nutzer an oder entferne bestehende Zugänge.
              </p>
            </div>
            <v-btn
              color="primary"
              prepend-icon="mdi-account-plus"
              @click="openCreateDialog"
            >
              Neuer Nutzer
            </v-btn>
          </div>

          <SearchSummaryBar
            v-model="search"
            :filtered-count="filteredUsers.length"
            :total-count="totalUsers"
            summary-label="Nutzer"
            class="mt-6"
          />

          <div class="mt-6">
            <v-alert v-if="usersError" type="error" variant="tonal">
              {{
                usersError?.data?.statusMessage ||
                usersError?.message ||
                "Nutzer konnten nicht geladen werden."
              }}
            </v-alert>

            <v-skeleton-loader
              v-else-if="usersStatus === 'pending'"
              type="table-heading, table-row@4"
              class="rounded-lg"
            />

            <template v-else>
              <v-data-table
                :headers="headers"
                :items="tableItems"
                :items-per-page="10"
                class="elevation-1"
                hover
              >
                <template #item.roleLabel="{ item }">
                  <v-chip
                    :color="item.roleColor"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ item.roleLabel }}
                  </v-chip>
                </template>
                <template #item.actions="{ item }">
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    :disabled="item.role === 'ADMIN' && adminCount <= 1"
                    @click="openDeleteDialog(item)"
                  />
                </template>
                <template #no-data>
                  <div class="py-8 text-medium-emphasis">
                    Noch keine Nutzer vorhanden.
                  </div>
                </template>
              </v-data-table>
            </template>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="createDialog" max-width="480">
      <v-card>
        <v-card-title class="text-h6 font-weight-semibold"
          >Neuen Nutzer anlegen</v-card-title
        >
        <v-divider />
        <v-card-text>
          <v-form ref="formRef">
            <v-text-field
              v-model="form.name"
              label="Name"
              :rules="[
                (v: string) => !!v?.trim() || 'Name darf nicht leer sein',
              ]"
              required
              density="comfortable"
              variant="outlined"
            />
            <v-text-field
              v-model="form.email"
              label="E-Mail"
              type="email"
              :rules="[
                (v: string) => !!v?.trim() || 'E-Mail darf nicht leer sein',
                (v: string) =>
                  /.+@.+\..+/.test(v) || 'Gib eine gültige E-Mail an',
              ]"
              required
              density="comfortable"
              variant="outlined"
            />
            <v-text-field
              v-model="form.password"
              label="Passwort"
              type="password"
              autocomplete="new-password"
              :rules="[
                (v: string) => !!v || 'Passwort darf nicht leer sein',
                (v: string) => v.length >= 8 || 'Mindestens 8 Zeichen',
              ]"
              required
              density="comfortable"
              variant="outlined"
            />
            <v-select
              v-model="form.role"
              :items="roleOptions"
              label="Rolle"
              density="comfortable"
              variant="outlined"
            />
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="createDialog = false">Abbrechen</v-btn>
          <v-btn :loading="isSubmitting" color="primary" @click="handleCreate"
            >Speichern</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card>
        <v-card-title class="text-h6 font-weight-semibold"
          >Nutzer löschen?</v-card-title
        >
        <v-divider />
        <v-card-text>
          <p class="mb-2">Möchtest du den Nutzer wirklich entfernen?</p>
          <p class="text-medium-emphasis mb-0">
            {{ userToDelete?.name }} &ndash; {{ userToDelete?.email }}
          </p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="deleteDialog = false">Abbrechen</v-btn>
          <v-btn :loading="isSubmitting" color="error" @click="handleDelete"
            >Löschen</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.users-page {
  min-height: 100%;
}

.users-page :deep(.v-data-table) {
  border-radius: 12px;
}
</style>
