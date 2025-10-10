<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useSnackbar } from "~/composables/useSnackbar"
import type { GroupFormPayload, GroupRecord } from "~/types/groups"
import GroupDataTable from "~/components/groups/GroupDataTable.vue"
import GroupFormDialog from "~/components/groups/GroupFormDialog.vue"
import DeleteConfirmationDialog from "~/components/common/DeleteConfirmationDialog.vue"
import SearchSummaryBar from "~/components/common/SearchSummaryBar.vue"

definePageMeta({ layout: "app-shell", middleware: "auth" })

const search = ref("")
const { open: openSnackbar } = useSnackbar()

const {
  data: groups,
  status: groupsStatus,
  error: groupsError,
  refresh: refreshGroups,
} = await useFetch<GroupRecord[]>("/api/groups/groups", {
  default: () => [],
})

const totalGroups = computed(() =>
  Array.isArray(groups.value) ? groups.value.length : 0,
)

const filteredGroups = computed(() => {
  const list = Array.isArray(groups.value) ? groups.value : []
  const term = search.value.trim().toLowerCase()
  if (!term) return list
  return list.filter((group) => {
    const memberNames = (group.members ?? [])
      .map((member) => member.name.toLowerCase())
      .join(" ")
    return (
      group.name.toLowerCase().includes(term) ||
      (group.color ?? "").toLowerCase().includes(term) ||
      memberNames.includes(term)
    )
  })
})

const createDialog = ref(false)
const editDialog = ref(false)
const deleteDialog = ref(false)

const groupBeingEdited = ref<GroupRecord | null>(null)
const groupToDelete = ref<GroupRecord | null>(null)

const isSubmitting = ref(false)

function openCreateDialog() {
  createDialog.value = true
}

function openEditDialog(group: GroupRecord) {
  groupBeingEdited.value = group
  editDialog.value = true
}

function openDeleteDialog(group: GroupRecord) {
  groupToDelete.value = group
  deleteDialog.value = true
}

function closeDeleteDialog() {
  groupToDelete.value = null
  deleteDialog.value = false
}

async function handleCreate(payload: GroupFormPayload) {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch("/api/groups/group", {
      method: "POST",
      body: {
        name: payload.name,
        color: payload.color,
        inRotation: payload.inRotation,
        members: payload.members,
      },
    })
    await refreshGroups()
    createDialog.value = false
    openSnackbar("Gruppe wurde erstellt.")
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage || "Gruppe konnte nicht erstellt werden.",
      "error",
    )
  } finally {
    isSubmitting.value = false
  }
}

async function handleEdit(payload: GroupFormPayload) {
  if (!groupBeingEdited.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch("/api/groups/group.update", {
      method: "POST",
      body: {
        id: groupBeingEdited.value.id,
        name: payload.name,
        color: payload.color,
        inRotation: payload.inRotation,
        members: payload.members,
      },
    })
    await refreshGroups()
    editDialog.value = false
    openSnackbar("Gruppe wurde aktualisiert.")
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage || "Gruppe konnte nicht aktualisiert werden.",
      "error",
    )
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete() {
  if (!groupToDelete.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch("/api/groups/group", {
      method: "DELETE",
      body: { id: groupToDelete.value.id },
    })
    await refreshGroups()
    closeDeleteDialog()
    openSnackbar("Gruppe wurde gelöscht.")
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage || "Gruppe konnte nicht gelöscht werden.",
      "error",
    )
  } finally {
    isSubmitting.value = false
  }
}

watch(editDialog, (open) => {
  if (!open) groupBeingEdited.value = null
})

watch(deleteDialog, (open) => {
  if (!open) groupToDelete.value = null
})
</script>

<template>
  <div class="groups-page">
    <v-row class="gy-6">
      <v-col cols="12">
        <v-card class="pa-6" elevation="2">
          <div
            class="d-flex flex-column flex-sm-row align-sm-center justify-space-between gap-4"
          >
            <div>
              <h1 class="text-h5 font-weight-semibold mb-1">
                Gruppenverwaltung
              </h1>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Verwalte Gruppenfarben, Mitglieder und Reihenfolge im
                Rotationsring.
              </p>
            </div>
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="openCreateDialog"
            >
              Neue Gruppe
            </v-btn>
          </div>

          <SearchSummaryBar
            v-model="search"
            :filtered-count="filteredGroups.length"
            :total-count="totalGroups"
            summary-label="Gruppen"
          />

          <div class="mt-6">
            <GroupDataTable
              :items="filteredGroups"
              :status="groupsStatus"
              :error="groupsError"
              @edit="openEditDialog"
              @delete="openDeleteDialog"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <GroupFormDialog
      v-model="createDialog"
      title="Neue Gruppe"
      submit-label="Speichern"
      :loading="isSubmitting"
      @submit="handleCreate"
    />

    <GroupFormDialog
      v-model="editDialog"
      title="Gruppe bearbeiten"
      submit-label="Aktualisieren"
      :initial-value="groupBeingEdited"
      :loading="isSubmitting"
      @submit="handleEdit"
    />

    <DeleteConfirmationDialog
      v-model="deleteDialog"
      title="Gruppe löschen"
      :loading="isSubmitting"
      @confirm="handleDelete"
    >
      <p class="text-body-2 mb-0">
        Möchtest du die Gruppe
        <strong>{{ groupToDelete?.name }}</strong>
        wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden.
      </p>
    </DeleteConfirmationDialog>
  </div>
</template>

<style scoped>
.groups-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.gap-4 {
  gap: 16px;
}
</style>
