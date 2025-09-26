<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

interface JobRecord {
  id: number
  name: string
  description: string
  icon: string | null
  rotationPointer?: number
  createdAt?: string
}

definePageMeta({ layout: 'app-shell' })

const search = ref('')
const snackbar = reactive({ show: false, color: 'success', message: '' })

const {
  data: jobs,
  status: jobsStatus,
  error: jobsError,
  refresh: refreshJobs,
} = await useFetch<JobRecord[]>('/api/jobs/jobs', {
  default: () => [],
})

const headers = [
  { title: 'Ämtli', key: 'name', align: 'start' },
  { title: 'Icon', key: 'icon', width: 120 },
  { title: 'Beschreibung', key: 'description' },
  { title: 'Aktionen', key: 'actions', sortable: false, width: 140 },
]

function resolveRow(slotItem: any): JobRecord {
  return (slotItem?.raw ?? slotItem?.item ?? slotItem) as JobRecord
}

const filteredJobs = computed(() => {
  const list = Array.isArray(jobs.value) ? jobs.value : []
  const term = search.value.trim().toLowerCase()
  if (!term) return list
  return list.filter((job) =>
    job.name.toLowerCase().includes(term) ||
    (job.description ?? '').toLowerCase().includes(term) ||
    (job.icon ?? '').toLowerCase().includes(term),
  )
})

const totalJobs = computed(() => (Array.isArray(jobs.value) ? jobs.value.length : 0))

const createDialog = ref(false)
const editDialog = ref(false)
const deleteDialog = ref(false)

const createForm = reactive({
  name: '',
  description: '',
  icon: '',
})

const editForm = reactive({
  id: 0,
  name: '',
  description: '',
  icon: '',
})

const jobToDelete = ref<JobRecord | null>(null)

const isCreateValid = computed(() => Boolean(createForm.name.trim() && createForm.icon.trim()))
const isEditValid = computed(() => Boolean(editForm.name.trim() && editForm.icon.trim()))

const isSubmitting = ref(false)

function resetCreateForm() {
  createForm.name = ''
  createForm.description = ''
  createForm.icon = ''
}

function openCreateDialog() {
  resetCreateForm()
  createDialog.value = true
}

function openEditDialog(job: JobRecord) {
  editForm.id = job.id
  editForm.name = job.name
  editForm.description = job.description ?? ''
  editForm.icon = job.icon ?? ''
  editDialog.value = true
}

function openDeleteDialog(job: JobRecord) {
  jobToDelete.value = job
  deleteDialog.value = true
}

function closeDeleteDialog() {
  jobToDelete.value = null
  deleteDialog.value = false
}

function showSnackbar(message: string, color: 'success' | 'error' = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

async function handleCreate() {
  if (!isCreateValid.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch('/api/jobs/job', {
      method: 'POST',
      body: {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        icon: createForm.icon.trim(),
      },
    })
    await refreshJobs()
    createDialog.value = false
    showSnackbar('Ämtli wurde erstellt.')
  } catch (error: any) {
    showSnackbar(error?.data?.statusMessage || 'Konnte Ämtli nicht erstellen.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

async function handleEdit() {
  if (!isEditValid.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch('/api/jobs/job.update', {
      method: 'POST',
      body: {
        id: editForm.id,
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        icon: editForm.icon.trim(),
      },
    })
    await refreshJobs()
    editDialog.value = false
    showSnackbar('Ämtli wurde aktualisiert.')
  } catch (error: any) {
    showSnackbar(error?.data?.statusMessage || 'Ämtli konnte nicht aktualisiert werden.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete() {
  if (!jobToDelete.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch('/api/jobs/job', {
      method: 'DELETE',
      body: { id: jobToDelete.value.id },
    })
    await refreshJobs()
    closeDeleteDialog()
    showSnackbar('Ämtli wurde entfernt.')
  } catch (error: any) {
    showSnackbar(error?.data?.statusMessage || 'Ämtli konnte nicht gelöscht werden.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

watch(createDialog, (open) => {
  if (!open) resetCreateForm()
})
</script>

<template>
  <div class="jobs-page">
    <v-row class="gy-6">
      <v-col cols="12">
        <v-card class="pa-6" elevation="2">
          <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between gap-4">
            <div>
              <h1 class="text-h5 font-weight-semibold mb-1">Ämtli Verwaltung</h1>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Erfasse neue Ämtli, aktualisiere bestehende und verwalte Icons & Beschreibungen.
              </p>
            </div>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
              Neues Ämtli
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
                {{ filteredJobs.length }} von {{ totalJobs }} Ämtli angezeigt
              </div>
            </div>
          </v-sheet>

          <div class="mt-6">
            <template v-if="jobsStatus === 'pending'">
              <v-skeleton-loader type="table" class="mt-4" />
            </template>
            <template v-else-if="jobsError">
              <v-alert type="error" variant="tonal">
                {{ jobsError?.message || 'Fehler beim Laden der Ämtli.' }}
              </v-alert>
            </template>
            <template v-else-if="!filteredJobs.length">
              <v-alert type="info" variant="tonal">
                Keine Ämtli gefunden. Lege ein neues Ämtli an, um zu starten.
              </v-alert>
            </template>
            <template v-else>
              <v-data-table
                :headers="headers"
                :items="filteredJobs"
                :items-per-page="10"
                class="jobs-table"
              >
                <template #item.icon="{ item }">
                  <div class="d-flex align-center">
                    <v-avatar size="32" color="primary" variant="tonal" class="mr-2">
                      <template v-if="resolveRow(item).icon?.startsWith('mdi-')">
                        <v-icon :icon="resolveRow(item).icon" />
                      </template>
                      <template v-else>
                        <span class="text-subtitle-2">{{ resolveRow(item).icon }}</span>
                      </template>
                    </v-avatar>
                  </div>
                </template>

                <template #item.description="{ item }">
                  <span class="text-body-2">{{ resolveRow(item).description || '—' }}</span>
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

    <v-dialog v-model="createDialog" max-width="520">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Neues Ämtli</span>
          <v-btn icon="mdi-close" variant="text" @click="createDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-form class="d-flex flex-column gap-4">
            <v-text-field
              v-model="createForm.name"
              label="Titel"
              required
              variant="outlined"
              density="comfortable"
              hint="Name des Ämtlis"
            />
            <v-text-field
              v-model="createForm.icon"
              label="Icon"
              required
              variant="outlined"
              density="comfortable"
              hint="Material Design Icon (mdi-*) oder Emoji"
            />
            <v-textarea
              v-model="createForm.description"
              label="Beschreibung"
              variant="outlined"
              density="comfortable"
              rows="4"
              auto-grow
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

    <v-dialog v-model="editDialog" max-width="520">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Ämtli bearbeiten</span>
          <v-btn icon="mdi-close" variant="text" @click="editDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-form class="d-flex flex-column gap-4">
            <v-text-field
              v-model="editForm.name"
              label="Titel"
              required
              variant="outlined"
              density="comfortable"
            />
            <v-text-field
              v-model="editForm.icon"
              label="Icon"
              required
              variant="outlined"
              density="comfortable"
            />
            <v-textarea
              v-model="editForm.description"
              label="Beschreibung"
              variant="outlined"
              density="comfortable"
              rows="4"
              auto-grow
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
          <span>Ämtli löschen</span>
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-0">
            Möchtest du das Ämtli
            <strong>{{ jobToDelete?.name }}</strong>
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
.jobs-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.jobs-table :deep(.v-data-table__td) {
  vertical-align: middle;
}

.jobs-table :deep(thead th) {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: rgba(0, 0, 0, 0.54);
}

.gap-4 {
  gap: 16px;
}

.gap-3 {
  gap: 12px;
}

.gap-1 {
  gap: 4px;
}

.jobs-table :deep(.v-btn--density-default) {
  min-width: 0;
}

@media (max-width: 600px) {
  .jobs-table :deep(.v-data-table__wrapper) {
    overflow-x: auto;
  }
}
</style>
