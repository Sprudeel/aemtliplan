<script setup lang="ts">
definePageMeta({ layout: "auth" });

const { t } = useI18n();
useSeoMeta({ title: () => t("invitation.title") });
const route = useRoute();
const notify = useNotify();
const { user } = useAuthSession();
const invitationId = computed(() => String(route.params.id));

const { data: invitation, error } = await useAsyncData(`invitation:${invitationId.value}`, async () =>
  unwrapAuth(await authClient.organization.getInvitation({ query: { id: invitationId.value } })),
  { server: false },
);

const busy = ref(false);
const verificationSent = ref(false);
const roleKey = computed(() => (invitation.value?.role === "member" ? "roles.viewer" : "roles.admin"));

async function accept() {
  busy.value = true;
  try {
    const result = unwrapAuth(await authClient.organization.acceptInvitation({ invitationId: invitationId.value }));
    await refreshNuxtData("my-plans");
    await navigateTo(`/plans/${result.invitation.organizationId}`);
  } catch (err) {
    notify.error(err);
  } finally {
    busy.value = false;
  }
}

async function reject() {
  busy.value = true;
  const ok = await notify.run(
    async () => unwrapAuth(await authClient.organization.rejectInvitation({ invitationId: invitationId.value })),
    "invitation.rejected",
  );
  busy.value = false;
  if (ok) await navigateTo("/plans");
}

async function resendVerification() {
  if (!user.value) return;
  const ok = await notify.run(async () =>
    unwrapAuth(await authClient.sendVerificationEmail({ email: user.value!.email, callbackURL: route.fullPath })),
  );
  verificationSent.value = ok;
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-semibold text-highlighted text-center">{{ t("invitation.title") }}</h1>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-mail-x"
      :title="t('invitation.invalid')"
      :description="t('invitation.invalidText', { email: user?.email })"
    />

    <template v-else-if="invitation">
      <p class="text-center text-muted">
        {{ t("invitation.text", { inviter: invitation.inviterEmail, plan: invitation.organizationName, role: t(roleKey) }) }}
      </p>

      <UAlert
        v-if="user && !user.emailVerified"
        color="warning"
        variant="subtle"
        icon="i-lucide-mail-warning"
        :title="t('invitation.verifyFirst')"
        :actions="verificationSent ? [] : [{ label: t('account.resendVerification'), onClick: resendVerification }]"
        :description="verificationSent ? t('account.verificationSent') : undefined"
      />

      <div class="flex gap-2">
        <UButton
          :label="t('invitation.reject')"
          color="neutral"
          variant="subtle"
          block
          :disabled="busy"
          @click="reject"
        />
        <UButton
          :label="t('invitation.accept')"
          block
          :loading="busy"
          :disabled="!user?.emailVerified"
          data-testid="accept-invitation"
          @click="accept"
        />
      </div>
    </template>

    <USkeleton v-else class="h-24 w-full" />
  </div>
</template>
