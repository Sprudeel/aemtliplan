<script setup lang="ts">
import { z } from "zod";

definePageMeta({ layout: "auth", guest: true });

const { t } = useI18n();
useSeoMeta({ title: () => t("auth.resetTitle") });
const route = useRoute();
const notify = useNotify();

// better-auth redirects here with ?token=... (or ?error=INVALID_TOKEN).
const token = computed(() => (typeof route.query.token === "string" ? route.query.token : ""));
const invalid = computed(() => !token.value || route.query.error === "INVALID_TOKEN");

const schema = computed(() =>
  z
    .object({ password: z.string().min(8, t("validation.passwordMin")), confirm: z.string() })
    .refine((value) => value.password === value.confirm, { message: t("validation.passwordMatch"), path: ["confirm"] }),
);
const state = reactive({ password: "", confirm: "" });
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    unwrapAuth(await authClient.resetPassword({ newPassword: state.password, token: token.value }));
    notify.success("auth.resetDone");
    await navigateTo("/login");
  } catch (error) {
    notify.error(error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-semibold text-highlighted text-center">{{ t("auth.resetTitle") }}</h1>

    <UAlert
      v-if="invalid"
      icon="i-lucide-link-2-off"
      color="error"
      variant="subtle"
      :title="t('auth.resetInvalid')"
    />

    <UForm v-else :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField :label="t('fields.newPassword')" name="password">
        <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>
      <UFormField :label="t('fields.passwordConfirm')" name="confirm">
        <UInput v-model="state.confirm" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>
      <UButton type="submit" :label="t('auth.resetSubmit')" :loading="loading" block />
    </UForm>

    <p class="text-center text-sm">
      <ULink :to="invalid ? '/forgot-password' : '/login'" class="text-primary font-medium">
        {{ invalid ? t("auth.requestNewLink") : t("auth.backToLogin") }}
      </ULink>
    </p>
  </div>
</template>
