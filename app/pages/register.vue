<script setup lang="ts">
import { z } from "zod";

definePageMeta({ layout: "auth", guest: true });

const { t } = useI18n();
useSeoMeta({ title: () => t("auth.registerTitle") });

const route = useRoute();
const notify = useNotify();
const { refresh } = useAuthSession();

const schema = computed(() =>
  z
    .object({
      name: z.string().trim().min(1, t("validation.required")),
      email: z.email(t("validation.email")),
      password: z.string().min(8, t("validation.passwordMin")),
      confirm: z.string(),
    })
    .refine((value) => value.password === value.confirm, {
      message: t("validation.passwordMatch"),
      path: ["confirm"],
    }),
);
const state = reactive({ name: "", email: "", password: "", confirm: "" });
const loading = ref(false);
const checkMail = ref(false);

const redirect = computed(() => {
  const value = route.query.redirect;
  return typeof value === "string" && value.startsWith("/") ? value : "/plans";
});

async function onSubmit() {
  loading.value = true;
  try {
    unwrapAuth(
      await authClient.signUp.email({
        name: state.name.trim(),
        email: state.email,
        password: state.password,
        callbackURL: redirect.value,
      }),
    );
    // With email verification required there is no session yet.
    if (await refresh()) await navigateTo(redirect.value);
    else checkMail.value = true;
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
      <h1 class="text-xl font-semibold text-highlighted">{{ t("auth.registerTitle") }}</h1>
      <p class="text-sm text-muted">{{ t("auth.registerSubtitle") }}</p>
    </div>

    <UAlert
      v-if="checkMail"
      icon="i-lucide-mail-check"
      color="success"
      variant="subtle"
      :title="t('auth.checkMailTitle')"
      :description="t('auth.checkMailText', { email: state.email })"
    />

    <UForm v-else :schema="schema" :state="state" class="space-y-4" data-testid="register-form" @submit="onSubmit">
      <UFormField :label="t('fields.name')" name="name" :hint="t('auth.nameHint')">
        <UInput v-model="state.name" autocomplete="name" class="w-full" />
      </UFormField>
      <UFormField :label="t('fields.email')" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UFormField :label="t('fields.password')" name="password">
        <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>
      <UFormField :label="t('fields.passwordConfirm')" name="confirm">
        <UInput v-model="state.confirm" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>
      <UButton type="submit" :label="t('auth.register')" :loading="loading" block />
    </UForm>

    <p class="text-center text-sm text-muted">
      {{ t("auth.haveAccount") }}
      <ULink :to="{ path: '/login', query: route.query }" class="text-primary font-medium">{{ t("auth.login") }}</ULink>
    </p>
  </div>
</template>
