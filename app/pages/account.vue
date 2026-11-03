<script setup lang="ts">
import { z } from "zod";

const { t, locale, locales, setLocale } = useI18n();
useSeoMeta({ title: () => t("nav.account") });
const notify = useNotify();
const { user, refresh } = useAuthSession();

const profile = reactive({ name: user.value?.name ?? "" });
const profileSchema = computed(() => z.object({ name: z.string().trim().min(1, t("validation.required")) }));

async function saveProfile() {
  await notify.run(async () => {
    unwrapAuth(await authClient.updateUser({ name: profile.name.trim() }));
    await refresh();
  }, "account.profileSaved");
}

const password = reactive({ current: "", next: "", confirm: "" });
const passwordSchema = computed(() =>
  z
    .object({
      current: z.string().min(1, t("validation.required")),
      next: z.string().min(8, t("validation.passwordMin")),
      confirm: z.string(),
    })
    .refine((value) => value.next === value.confirm, { message: t("validation.passwordMatch"), path: ["confirm"] })
    .refine((value) => value.next !== value.current, { message: t("validation.passwordDifferent"), path: ["next"] }),
);

async function changePassword() {
  const ok = await notify.run(
    async () =>
      unwrapAuth(
        await authClient.changePassword({
          currentPassword: password.current,
          newPassword: password.next,
          revokeOtherSessions: true,
        }),
      ),
    "account.passwordChanged",
  );
  if (ok) Object.assign(password, { current: "", next: "", confirm: "" });
}

const verificationSent = ref(false);
async function resendVerification() {
  if (!user.value) return;
  verificationSent.value = await notify.run(async () =>
    unwrapAuth(await authClient.sendVerificationEmail({ email: user.value!.email, callbackURL: "/account" })),
  );
}

const localeItems = computed(() => locales.value.map((entry) => ({ label: entry.name ?? entry.code, value: entry.code })));
</script>

<template>
  <UDashboardPanel id="account" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="t('nav.account')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 w-full lg:max-w-2xl mx-auto">
        <UPageCard :title="t('account.profile')" variant="subtle">
          <UForm :schema="profileSchema" :state="profile" class="space-y-4" @submit="saveProfile">
            <UFormField :label="t('fields.name')" name="name">
              <UInput v-model="profile.name" class="w-full" />
            </UFormField>
            <UFormField :label="t('fields.email')">
              <UInput :model-value="user?.email" disabled class="w-full" />
            </UFormField>
            <UAlert
              v-if="user && !user.emailVerified"
              color="warning"
              variant="subtle"
              icon="i-lucide-mail-warning"
              :title="t('account.notVerified')"
              :description="verificationSent ? t('account.verificationSent') : undefined"
              :actions="verificationSent ? [] : [{ label: t('account.resendVerification'), onClick: resendVerification }]"
            />
            <UButton type="submit" :label="t('actions.save')" />
          </UForm>
        </UPageCard>

        <UPageCard :title="t('account.password')" variant="subtle">
          <UForm :schema="passwordSchema" :state="password" class="space-y-4" @submit="changePassword">
            <UFormField :label="t('fields.currentPassword')" name="current">
              <UInput v-model="password.current" type="password" autocomplete="current-password" class="w-full" />
            </UFormField>
            <UFormField :label="t('fields.newPassword')" name="next">
              <UInput v-model="password.next" type="password" autocomplete="new-password" class="w-full" />
            </UFormField>
            <UFormField :label="t('fields.passwordConfirm')" name="confirm">
              <UInput v-model="password.confirm" type="password" autocomplete="new-password" class="w-full" />
            </UFormField>
            <UButton type="submit" :label="t('account.changePassword')" />
          </UForm>
        </UPageCard>

        <UPageCard :title="t('user.language')" variant="subtle">
          <USelect
            :model-value="locale"
            :items="localeItems"
            class="w-48"
            @update:model-value="(value) => setLocale(value as 'de' | 'fr' | 'it')"
          />
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
