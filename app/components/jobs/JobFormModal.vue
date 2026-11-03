<script setup lang="ts">
import { z } from "zod";
import type { JobDto } from "~~/shared/types/api";

const props = defineProps<{ job?: JobDto | null }>();
const emit = defineEmits<{ saved: [JobDto] }>();
const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();
const notify = useNotify();
const api = usePlanApiBase();

const EMOJIS = ["🍽️", "🧼", "🧹", "🚽", "🪵", "💧", "🔥", "🗑️", "🧺", "🥔", "🍞", "⛺"];

const state = reactive({ name: "", icon: "", description: "" });
watch(open, (isOpen) => {
  if (!isOpen) return;
  state.name = props.job?.name ?? "";
  state.icon = props.job?.icon ?? "";
  state.description = props.job?.description ?? "";
});

const schema = computed(() =>
  z.object({
    name: z.string().trim().min(1, t("validation.required")).max(80),
    icon: z.string().trim().max(64),
    description: z.string().trim().max(500),
  }),
);
const saving = ref(false);

async function onSubmit() {
  saving.value = true;
  try {
    const body = { name: state.name.trim(), icon: state.icon.trim() || null, description: state.description.trim() || null };
    const saved = props.job
      ? await plainFetch<JobDto>(`${api.value}/jobs/${props.job.id}`, { method: "PATCH", body })
      : await plainFetch<JobDto>(`${api.value}/jobs`, { method: "POST", body: { ...body, icon: body.icon ?? undefined, description: body.description ?? undefined } });
    notify.success(props.job ? "jobs.updated" : "jobs.created");
    emit("saved", saved);
    open.value = false;
  } catch (error) {
    notify.error(error);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="job ? t('jobs.edit') : t('jobs.create')">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" data-testid="job-form" @submit="onSubmit">
        <UFormField :label="t('fields.name')" name="name">
          <UInput v-model="state.name" :placeholder="t('jobs.namePlaceholder')" class="w-full" autofocus />
        </UFormField>
        <UFormField :label="t('fields.icon')" name="icon" :hint="t('jobs.iconHint')">
          <div class="flex items-center gap-2">
            <JobIcon :icon="state.icon" />
            <UInput v-model="state.icon" class="flex-1" />
          </div>
          <div class="mt-2 flex flex-wrap gap-1">
            <UButton
              v-for="emoji in EMOJIS"
              :key="emoji"
              :label="emoji"
              size="xs"
              color="neutral"
              :variant="state.icon === emoji ? 'solid' : 'ghost'"
              @click="state.icon = emoji"
            />
          </div>
        </UFormField>
        <UFormField :label="t('fields.description')" name="description">
          <UTextarea v-model="state.description" :rows="2" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton :label="t('actions.cancel')" color="neutral" variant="subtle" @click="open = false" />
          <UButton type="submit" :label="t('actions.save')" :loading="saving" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
