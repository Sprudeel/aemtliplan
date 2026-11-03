<script setup lang="ts">
import { z } from "zod";
import type { GroupDto, MemberDto } from "~~/shared/types/api";

const props = defineProps<{ group: GroupDto | null; member: MemberDto | null }>();
const emit = defineEmits<{ invited: [] }>();
const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();
const notify = useNotify();
const api = usePlanApiBase();
const state = reactive({ email: "" });
const schema = computed(() => z.object({ email: z.email(t("validation.email")) }));
const sending = ref(false);
watch(open, (isOpen) => isOpen && (state.email = ""));

async function onSubmit() {
  if (!props.group || !props.member) return;
  sending.value = true;
  // Plain string: the typed route matcher of $fetch is too deep for this path.
  const url: string = `${api.value}/groups/${props.group.id}/members/${props.member.id}/invite`;
  const ok = await notify.run(
    () => plainFetch(url, { method: "POST", body: { email: state.email } }),
    "groups.invited",
    { email: state.email },
  );
  sending.value = false;
  if (ok) {
    emit("invited");
    open.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('groups.inviteTitle', { name: member?.name })" :description="t('groups.inviteText')">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField :label="t('fields.email')" name="email">
          <UInput v-model="state.email" type="email" class="w-full" autofocus />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton :label="t('actions.cancel')" color="neutral" variant="subtle" @click="open = false" />
          <UButton type="submit" :label="t('groups.sendInvite')" :loading="sending" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
