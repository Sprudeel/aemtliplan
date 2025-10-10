<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useSnackbar } from "~/composables/useSnackbar"
import type { JobFormPayload, JobRecord } from "~/types/jobs"
import JobDataTable from "~/components/jobs/JobDataTable.vue"
import JobFormDialog from "~/components/jobs/JobFormDialog.vue"
import DeleteConfirmationDialog from "~/components/common/DeleteConfirmationDialog.vue"
import SearchSummaryBar from "~/components/common/SearchSummaryBar.vue"

definePageMeta({ layout: "app-shell", middleware: "auth" })

const search = ref("")
const { open: openSnackbar } = useSnackbar()

const {
  data: jobs,
  status: jobsStatus,
  error: jobsError,
  refresh: refreshJobs,
} = await useFetch<JobRecord[]>("/api/jobs/jobs", {
  default: () => [],
})

const filteredJobs = computed(() => {
  const list = Array.isArray(jobs.value) ? jobs.value : []
  const term = search.value.trim().toLowerCase()
  if (!term) return list
  return list.filter(
    (job) =>
      job.name.toLowerCase().includes(term) ||
      (job.description ?? "").toLowerCase().includes(term) ||
      (job.icon ?? "").toLowerCase().includes(term),
  )
})

const totalJobs = computed(() =>
  Array.isArray(jobs.value) ? jobs.value.length : 0,
)

const createDialog = ref(false)
const editDialog = ref(false)
const deleteDialog = ref(false)

const jobBeingEdited = ref<JobRecord | null>(null)
const jobToDelete = ref<JobRecord | null>(null)

const isSubmitting = ref(false)

function openCreateDialog() {
  createDialog.value = true
}

function openEditDialog(job: JobRecord) {
  jobBeingEdited.value = job
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

async function handleCreate(payload: JobFormPayload) {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch("/api/jobs/job", {
      method: "POST",
      body: {
        name: payload.name,
        description: payload.description,
        icon: payload.icon,
      },
    })
    await refreshJobs()
    createDialog.value = false
    openSnackbar("Ämtli wurde erstellt.")
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage || "Konnte Ämtli nicht erstellen.",
      "error",
    )
  } finally {
    isSubmitting.value = false
  }
}

async function handleEdit(payload: JobFormPayload) {
  if (!jobBeingEdited.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch("/api/jobs/job.update", {
      method: "POST",
      body: {
        id: jobBeingEdited.value.id,
        name: payload.name,
        description: payload.description,
        icon: payload.icon,
      },
    })
    await refreshJobs()
    editDialog.value = false
    openSnackbar("Ämtli wurde aktualisiert.")
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage || "Ämtli konnte nicht aktualisiert werden.",
      "error",
    )
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete() {
  if (!jobToDelete.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch("/api/jobs/job", {
      method: "DELETE",
      body: { id: jobToDelete.value.id },
    })
    await refreshJobs()
    closeDeleteDialog()
    openSnackbar("Ämtli wurde entfernt.")
  } catch (error: any) {
    openSnackbar(
      error?.data?.statusMessage || "Ämtli konnte nicht gelöscht werden.",
      "error",
    )
  } finally {
    isSubmitting.value = false
  }
}

watch(editDialog, (open) => {
  if (!open) jobBeingEdited.value = null
})

watch(deleteDialog, (open) => {
  if (!open) jobToDelete.value = null
})
</script>

<template>
  <div class="jobs-page">
    <v-row class="gy-6">
      <v-col cols="12">
        <v-card class="pa-6" elevation="2">
          <div
            class="d-flex flex-column flex-sm-row align-sm-center justify-space-between gap-4"
          >
            <div>
              <h1 class="text-h5 font-weight-semibold mb-1">
                Ämtli Verwaltung
              </h1>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Erfasse neue Ämtli, aktualisiere bestehende und verwalte Icons &
                Beschreibungen.
              </p>
            </div>
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="openCreateDialog"
            >
              Neues Ämtli
            </v-btn>
          </div>

          <SearchSummaryBar
            v-model="search"
            :filtered-count="filteredJobs.length"
            :total-count="totalJobs"
            summary-label="Ämtli"
          />

          <div class="mt-6">
            <JobDataTable
              :items="filteredJobs"
              :status="jobsStatus"
              :error="jobsError"
              @edit="openEditDialog"
              @delete="openDeleteDialog"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <JobFormDialog
      v-model="createDialog"
      title="Neues Ämtli"
      submit-label="Speichern"
      :loading="isSubmitting"
      @submit="handleCreate"
    />

    <JobFormDialog
      v-model="editDialog"
      title="Ämtli bearbeiten"
      submit-label="Aktualisieren"
      :initial-value="jobBeingEdited"
      :loading="isSubmitting"
      @submit="handleEdit"
    />

    <DeleteConfirmationDialog
      v-model="deleteDialog"
      title="Ämtli löschen"
      :loading="isSubmitting"
      @confirm="handleDelete"
    >
      <p class="text-body-2 mb-0">
        Möchtest du das Ämtli
        <strong>{{ jobToDelete?.name }}</strong>
        wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden.
      </p>
    </DeleteConfirmationDialog>
  </div>
</template>

<style scoped>
.jobs-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.gap-4 {
  gap: 16px;
}
</style>
