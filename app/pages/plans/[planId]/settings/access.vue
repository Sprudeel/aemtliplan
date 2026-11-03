<script setup lang="ts">
import { z } from "zod";

interface AccessMember {
  id: string;
  role: string;
  userId: string;
  user: { name: string; email: string };
}
interface AccessInvitation {
  id: string;
  email: string;
  role: string | null;
  status: string;
}
interface FullPlan {
  members: AccessMember[];
  invitations: AccessInvitation[];
}

const { t } = useI18n();
useSeoMeta({ title: () => t("nav.settingsAccess") });
const { plan, refresh: refreshPlan } = usePlan();
const api = usePlanApiBase();
const planId = usePlanId();
const notify = useNotify();
const { user } = useAuthSession();

const { data: full, refresh } = useAsyncData(
  () => `plan:${planId.value}:access`,
  async () => unwrapAuth(await authClient.organization.getFullOrganization({ query: { organizationId: planId.value } })) as unknown as FullPlan,
  { server: false },
);
const pending = computed(() => full.value?.invitations.filter((invitation) => invitation.status === "pending") ?? []);

const roleItems = computed(() => [
  { label: t("roles.admin"), value: "admin" },
  { label: t("roles.viewer"), value: "member" },
]);
const roleLabel = (role: string | null) =>
  role === "owner" ? t("roles.owner") : role === "admin" ? t("roles.admin") : t("roles.viewer");

// ---- invite ----
const invite = reactive({ email: "", role: "member" as "member" | "admin" });
const inviteSchema = computed(() => z.object({ email: z.email(t("validation.email")), role: z.enum(["member", "admin"]) }));
async function sendInvite() {
  const ok = await notify.run(
    async () =>
      unwrapAuth(await authClient.organization.inviteMember({ email: invite.email, role: invite.role, organizationId: planId.value })),
    "access.invited",
    { email: invite.email },
  );
  if (ok) {
    invite.email = "";
    await refresh();
  }
}

async function changeRole(member: AccessMember, role: string) {
  const ok = await notify.run(
    async () =>
      unwrapAuth(await authClient.organization.updateMemberRole({ memberId: member.id, role: role as "admin" | "member", organizationId: planId.value })),
    "access.roleChanged",
  );
  await refresh();
  if (ok && member.userId === user.value?.id) await refreshPlan();
}

const removeOpen = ref(false);
const removing = ref<AccessMember | null>(null);
async function confirmRemove() {
  if (!removing.value) return;
  const ok = await notify.run(
    async () =>
      unwrapAuth(await authClient.organization.removeMember({ memberIdOrEmail: removing.value!.id, organizationId: planId.value })),
    "access.removed",
  );
  removeOpen.value = false;
  if (ok) await refresh();
}

async function cancelInvitation(invitation: AccessInvitation) {
  const ok = await notify.run(
    async () => unwrapAuth(await authClient.organization.cancelInvitation({ invitationId: invitation.id })),
    "access.invitationCancelled",
  );
  if (ok) await refresh();
}

async function setMemberLogin(value: boolean) {
  const ok = await notify.run(() => plainFetch(`${api.value}/settings`, { method: "PATCH", body: { memberLogin: value } }), "settings.saved");
  if (ok) await refreshPlan();
}
</script>

<template>
  <UPageCard :title="t('access.invite')" :description="t('access.inviteText')" variant="subtle">
    <UForm :schema="inviteSchema" :state="invite" class="flex flex-wrap items-start gap-2" data-testid="invite-form" @submit="sendInvite">
      <UFormField name="email" class="flex-1 min-w-56">
        <UInput v-model="invite.email" type="email" :placeholder="t('fields.email')" class="w-full" />
      </UFormField>
      <USelect v-model="invite.role" :items="roleItems" class="w-32" />
      <UButton type="submit" :label="t('access.send')" icon="i-lucide-send" />
    </UForm>
  </UPageCard>

  <UPageCard :title="t('access.people')" variant="subtle" :ui="{ container: 'p-0 sm:p-0 gap-y-0', header: 'p-4 mb-0 border-b border-default' }">
    <ul class="divide-y divide-default" data-testid="access-list">
      <li v-for="member in full?.members ?? []" :key="member.id" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div class="min-w-0">
          <p class="font-medium text-highlighted truncate">{{ member.user.name }}</p>
          <p class="text-sm text-muted truncate">{{ member.user.email }}</p>
        </div>
        <div class="flex items-center gap-2">
          <UBadge v-if="member.role === 'owner'" :label="roleLabel('owner')" variant="subtle" />
          <template v-else>
            <USelect
              :model-value="member.role.includes('admin') ? 'admin' : 'member'"
              :items="roleItems"
              size="sm"
              class="w-28"
              @update:model-value="(value) => changeRole(member, String(value))"
            />
            <UButton
              icon="i-lucide-user-minus"
              color="error"
              variant="ghost"
              :aria-label="t('access.remove')"
              @click="() => { removing = member; removeOpen = true }"
            />
          </template>
        </div>
      </li>
      <li v-for="invitation in pending" :key="invitation.id" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div class="min-w-0">
          <p class="font-medium text-highlighted truncate">{{ invitation.email }}</p>
          <p class="text-sm text-muted">{{ t("access.pending") }} · {{ roleLabel(invitation.role) }}</p>
        </div>
        <UButton :label="t('access.cancelInvitation')" size="sm" color="neutral" variant="ghost" @click="cancelInvitation(invitation)" />
      </li>
    </ul>
  </UPageCard>

  <UPageCard :title="t('access.memberLogin')" :description="t('access.memberLoginText')" variant="subtle">
    <USwitch :model-value="plan?.settings.memberLogin ?? false" :label="t('access.memberLoginSwitch')" @update:model-value="setMemberLogin" />
  </UPageCard>

  <ConfirmModal
    v-model:open="removeOpen"
    :title="t('access.remove')"
    :description="t('access.removeText', { name: removing?.user.name })"
    :confirm-label="t('access.remove')"
    @confirm="confirmRemove"
  />
</template>
