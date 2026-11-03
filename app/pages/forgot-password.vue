<script setup lang="ts">
import { z } from "zod";

definePageMeta({ layout: "auth", guest: true });

const { t } = useI18n();
useSeoMeta({ title: () => t("auth.forgotTitle") });
const notify = useNotify();

const schema = computed(() => z.object({ email: z.email(t("validation.email")) }));
const state = reactive({ email: "" });
const loading = ref(false);
const sent = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    unwrapAuth(await authClient.requestPasswordReset({ email: state.email, redirectTo: "/reset-password" }));
    // Same message whether the account exists or not.
    sent.value = true;
  } catch (error) {
    notify.error(error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="text-center space-y-1">
      <h1 class="text-xl font-semibold text-highlighted">{{ t("auth.forgotTitle") }}</h1>
      <p class="text-sm text-muted">{{ t("auth.forgotSubtitle") }}</p>
    </div>

    <UAlert
      v-if="sent"
      icon="i-lucide-mail-check"
      color="success"
      variant="subtle"
      :title="t('auth.resetSentTitle')"
      :description="t('auth.resetSentText')"
      data-testid="reset-sent"
    />

    <UForm v-else :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField :label="t('fields.email')" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UButton type="submit" :label="t('auth.sendResetLink')" :loading="loading" block />
    </UForm>

    <p class="text-center text-sm">
      <ULink to="/login" class="text-primary font-medium">{{ t("auth.backToLogin") }}</ULink>
    </p>
  </div>
</template>
