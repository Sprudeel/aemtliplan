<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

interface GroupMember {
  id?: number
  name: string
}

interface GroupRecord {
  id: number
  name: string
  color: string
  rotationIndex: number
  members: GroupMember[]
}

definePageMeta({ layout: 'app-shell' })

const search = ref('')
const snackbar = reactive({ show: false, color: 'success', message: '' })

const {
  data: groups,
  status: groupsStatus,
  error: groupsError,
  refresh: refreshGroups,
} = await useFetch<GroupRecord[]>('/api/groups/groups', {
  default: () => [],
})

const headers = [
  { title: 'Gruppe', key: 'name', align: 'start' },
  { title: 'Farbe', key: 'color', width: 160 },
  { title: 'Mitglieder', key: 'members' },
  { title: 'Aktionen', key: 'actions', sortable: false, width: 140 },
]

const totalGroups = computed(() => (Array.isArray(groups.value) ? groups.value.length : 0))

const filteredGroups = computed(() => {
  const list = Array.isArray(groups.value) ? groups.value : []
  const term = search.value.trim().toLowerCase()
  if (!term) return list
  return list.filter((group) => {
    const memberNames = (group.members ?? []).map((m) => m.name.toLowerCase()).join(' ')
    return (
      group.name.toLowerCase().includes(term) ||
      (group.color ?? '').toLowerCase().includes(term) ||
      memberNames.includes(term)
    )
  })
})

const createDialog = ref(false)
const editDialog = ref(false)
const deleteDialog = ref(false)

const createForm = reactive({
  name: '',
  color: '#90CAF9',
  members: [] as string[],
})

const editForm = reactive({
  id: 0,
  name: '',
  color: '#90CAF9',
  members: [] as string[],
})

const groupToDelete = ref<GroupRecord | null>(null)
const isSubmitting = ref(false)

const isCreateValid = computed(() => Boolean(createForm.name.trim()) && cleanMembers(createForm.members).length > 0)
const isEditValid = computed(() => Boolean(editForm.name.trim()) && cleanMembers(editForm.members).length > 0)

function cleanMembers(list: string[]): string[] {
  return Array.from(new Set(list.map((m) => m?.trim()).filter((m): m is string => Boolean(m))))
}

function resetCreateForm() {
  createForm.name = ''
  createForm.color = '#90CAF9'
  createForm.members = []
}

function openCreateDialog() {
  resetCreateForm()
  createDialog.value = true
}

function openEditDialog(group: GroupRecord) {
  editForm.id = group.id
  editForm.name = group.name
  editForm.color = group.color || '#90CAF9'
  editForm.members = cleanMembers((group.members ?? []).map((m) => m.name))
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

function showSnackbar(message: string, color: 'success' | 'error' = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

function resolveRow(slotItem: any): GroupRecord {
  return (slotItem?.raw ?? slotItem?.item ?? slotItem) as GroupRecord
}

async function handleCreate() {
  if (!isCreateValid.value || isSubmitting.value) return
  const members = cleanMembers(createForm.members)
  if (!members.length) {
    showSnackbar('Bitte mindestens ein Mitglied angeben.', 'error')
    return
  }
  isSubmitting.value = true
  try {
    await $fetch('/api/groups/group', {
      method: 'POST',
      body: {
        name: createForm.name.trim(),
        color: createForm.color,
        members,
      },
    })
    await refreshGroups()
    createDialog.value = false
    showSnackbar('Gruppe wurde erstellt.')
  } catch (error: any) {
    showSnackbar(error?.data?.statusMessage || 'Gruppe konnte nicht erstellt werden.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

async function handleEdit() {
  if (!isEditValid.value || isSubmitting.value) return
  const members = cleanMembers(editForm.members)
  if (!members.length) {
    showSnackbar('Bitte mindestens ein Mitglied angeben.', 'error')
    return
  }
  isSubmitting.value = true
  try {
    await $fetch('/api/groups/group.update', {
      method: 'POST',
      body: {
        id: editForm.id,
        name: editForm.name.trim(),
        color: editForm.color,
        members,
      },
    })
    await refreshGroups()
    editDialog.value = false
    showSnackbar('Gruppe wurde aktualisiert.')
  } catch (error: any) {
    showSnackbar(error?.data?.statusMessage || 'Gruppe konnte nicht aktualisiert werden.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete() {
  if (!groupToDelete.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch('/api/groups/group', {
      method: 'DELETE',
      body: { id: groupToDelete.value.id },
    })
    await refreshGroups()
    closeDeleteDialog()
    showSnackbar('Gruppe wurde gelöscht.')
  } catch (error: any) {
    showSnackbar(error?.data?.statusMessage || 'Gruppe konnte nicht gelöscht werden.', 'error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="groups-page">
    <v-row class="gy-6">
      <v-col cols="12">
        <v-card class="pa-6" elevation="2">
          <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between gap-4">
            <div>
              <h1 class="text-h5 font-weight-semibold mb-1">Gruppenverwaltung</h1>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Verwalte Gruppenfarben, Mitglieder und Reihenfolge im Rotationsring.
              </p>
            </div>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
              Neue Gruppe
            </v-btn>
          </div>

          <v-sheet class="mt-6 pa-4" rounded="lg" color="grey-lighten-4">
            <div class="d-flex flex-column flex-md-row align-md-center justify-space-between gap-3">
              <v-text-field
                v-model="search"
                label="Suchen"
                prepend-inner-icon="mdi-magnify"
                density="comfortable"
                variant="outlined"
                class="flex-grow-1"
                clearable
              />
              <div class="text-caption text-medium-emphasis">
                {{ filteredGroups.length }} von {{ totalGroups }} Gruppen angezeigt
              </div>
            </div>
          </v-sheet>

          <div class="mt-6">
            <template v-if="groupsStatus === 'pending'">
              <v-skeleton-loader type="table" class="mt-4" />
            </template>
            <template v-else-if="groupsError">
              <v-alert type="error" variant="tonal">
                {{ groupsError?.message || 'Fehler beim Laden der Gruppen.' }}
              </v-alert>
            </template>
            <template v-else-if="!filteredGroups.length">
              <v-alert type="info" variant="tonal">
                Keine Gruppen gefunden. Lege eine neue Gruppe an, um zu starten.
              </v-alert>
            </template>
            <template v-else>
              <v-data-table
                :headers="headers"
                :items="filteredGroups"
                :items-per-page="10"
                class="groups-table"
              >
                <template #item.color="{ item }">
                  <div class="d-flex align-center gap-2">
                    <v-chip size="small" :style="{ backgroundColor: resolveRow(item).color, color: '#fff' }" label>
                      {{ resolveRow(item).color }}
                    </v-chip>
                  </div>
                </template>

                <template #item.members="{ item }">
                  <div class="group-members">
                    <template v-if="resolveRow(item).members?.length">
                      <v-chip
                        v-for="member in resolveRow(item).members"
                        :key="member.id ?? member.name"
                        size="small"
                        class="me-1 mb-1"
                        variant="outlined"
                        color="primary"
                      >
                        {{ member.name }}
                      </v-chip>
                    </template>
                    <span v-else class="text-medium-emphasis">Keine Mitglieder</span>
                  </div>
                </template>

                <template #item.actions="{ item }">
                  <div class="d-flex gap-1">
                    <v-btn
                      size="small"
                      variant="text"
                      color="primary"
                      icon="mdi-pencil"
                      @click="openEditDialog(resolveRow(item))"
                    />
                    <v-btn
                      size="small"
                      variant="text"
                      color="error"
                      icon="mdi-delete"
                      @click="openDeleteDialog(resolveRow(item))"
                    />
                  </div>
                </template>
              </v-data-table>
            </template>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="createDialog" max-width="560">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Neue Gruppe</span>
          <v-btn icon="mdi-close" variant="text" @click="createDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-form class="d-flex flex-column gap-4">
            <v-text-field
              v-model="createForm.name"
              label="Name"
              required
              variant="outlined"
              density="comfortable"
            />
            <v-color-picker
              v-model="createForm.color"
              mode="hex"
              hide-inputs
              elevation="0"
              class="color-picker"
            />
            <v-combobox
              v-model="createForm.members"
              label="Mitglieder"
              chips
              multiple
              clearable
              variant="outlined"
              density="comfortable"
              hint="Mit Enter bestätigen"
            />
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="createDialog = false">Abbrechen</v-btn>
          <v-btn
            color="primary"
            :disabled="!isCreateValid || isSubmitting"
            :loading="isSubmitting"
            @click="handleCreate"
          >
            Speichern
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editDialog" max-width="560">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Gruppe bearbeiten</span>
          <v-btn icon="mdi-close" variant="text" @click="editDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-form class="d-flex flex-column gap-4">
            <v-text-field
              v-model="editForm.name"
              label="Name"
              required
              variant="outlined"
              density="comfortable"
            />
            <v-color-picker
              v-model="editForm.color"
              mode="hex"
              hide-inputs
              elevation="0"
              class="color-picker"
            />
            <v-combobox
              v-model="editForm.members"
              label="Mitglieder"
              chips
              multiple
              clearable
              variant="outlined"
              density="comfortable"
              hint="Mit Enter bestätigen"
            />
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="editDialog = false">Abbrechen</v-btn>
          <v-btn
            color="primary"
            :disabled="!isEditValid || isSubmitting"
            :loading="isSubmitting"
            @click="handleEdit"
          >
            Aktualisieren
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-alert" color="error" class="me-2" />
          <span>Gruppe löschen</span>
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-0">
            Möchtest du die Gruppe
            <strong>{{ groupToDelete?.name }}</strong>
            wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden.
          </p>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeDeleteDialog">Abbrechen</v-btn>
          <v-btn color="error" :loading="isSubmitting" @click="handleDelete">Löschen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3500"
      location="bottom right"
      elevation="2"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn color="white" variant="text" @click="snackbar.show = false">Schliessen</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.groups-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.groups-table :deep(.v-data-table__td) {
  vertical-align: middle;
}

.groups-table :deep(thead th) {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: rgba(0, 0, 0, 0.54);
}

.group-members {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.color-picker {
  max-width: 280px;
}

.gap-4 {
  gap: 16px;
}

.gap-3 {
  gap: 12px;
}

.groups-table :deep(.v-btn--density-default) {
  min-width: 0;
}

@media (max-width: 600px) {
  .groups-table :deep(.v-data-table__wrapper) {
    overflow-x: auto;
  }

  .color-picker {
    max-width: 100%;
  }
}
</style>
