<script setup lang="ts">
import { z } from "zod";
import type { GroupDto } from "~~/shared/types/api";

const props = defineProps<{ group?: GroupDto | null }>();
const emit = defineEmits<{ saved: [GroupDto] }>();
const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();
const notify = useNotify();
const api = usePlanApiBase();

const COLORS = ["#A81B00", "#A88100", "#00A819", "#0014A8", "#A8009A", "#00838F", "#5D4037", "#455A64"];

const state = reactive({ name: "", color: COLORS[0]!, members: [] as string[], inRotation: true });
watch(open, (isOpen) => {
  if (!isOpen) return;
  state.name = props.group?.name ?? "";
  state.color = props.group?.color ?? COLORS[0]!;
  state.members = props.group?.members.map((member) => member.name) ?? [];
  state.inRotation = props.group?.inRotation ?? true;
});

const schema = computed(() =>
  z.object({
    name: z.string().trim().min(1, t("validation.required")).max(80),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, t("validation.color")),
    members: z.array(z.string().trim().min(1)).min(1, t("validation.membersMin")).max(100),
    inRotation: z.boolean(),
  }),
);
const saving = ref(false);

async function onSubmit() {
  saving.value = true;
  try {
    const body = { ...state, name: state.name.trim(), color: state.color.toUpperCase() };
    const saved = props.group
      ? await plainFetch<GroupDto>(`${api.value}/groups/${props.group.id}`, { method: "PATCH", body })
      : await plainFetch<GroupDto>(`${api.value}/groups`, { method: "POST", body });
    notify.success(props.group ? "groups.updated" : "groups.created");
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
  <UModal v-model:open="open" :title="group ? t('groups.edit') : t('groups.create')">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" data-testid="group-form" @submit="onSubmit">
        <UFormField :label="t('fields.name')" name="name">
          <UInput v-model="state.name" class="w-full" autofocus />
        </UFormField>

        <UFormField :label="t('fields.color')" name="color">
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="color in COLORS"
              :key="color"
              type="button"
              class="size-7 rounded-full ring-offset-2 ring-offset-default"
              :class="state.color.toUpperCase() === color ? 'ring-2 ring-primary' : ''"
              :style="{ backgroundColor: color }"
              :aria-label="color"
              @click="state.color = color"
            />
            <UPopover>
              <UButton icon="i-lucide-palette" color="neutral" variant="ghost" :aria-label="t('groups.customColor')" />
              <template #content>
                <UColorPicker v-model="state.color" class="p-2" />
              </template>
            </UPopover>
            <GroupChip :group="{ name: state.name || t('groups.preview'), color: state.color }" size="sm" />
          </div>
        </UFormField>

        <UFormField :label="t('fields.members')" name="members" :hint="t('groups.membersHint')">
          <UInputTags v-model="state.members" :placeholder="t('groups.addMember')" class="w-full" data-testid="members-input" />
        </UFormField>

        <UFormField name="inRotation">
          <USwitch v-model="state.inRotation" :label="t('groups.inRotation')" :description="t('groups.inRotationHint')" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton :label="t('actions.cancel')" color="neutral" variant="subtle" @click="open = false" />
          <UButton type="submit" :label="t('actions.save')" :loading="saving" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
