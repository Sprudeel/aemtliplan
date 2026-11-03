<script setup lang="ts">
import { z } from "zod";

definePageMeta({ layout: "auth", guest: true });

const { t } = useI18n();
useSeoMeta({ title: () => t("auth.loginTitle") });

const route = useRoute();
const notify = useNotify();
const { refresh } = useAuthSession();
const { data: flags } = useFeatureFlags();

const schema = computed(() =>
  z.object({
    email: z.email(t("validation.email")),
    password: z.string().min(1, t("validation.required")),
  }),
);
const state = reactive({ email: "", password: "" });
const loading = ref(false);

const redirect = computed(() => {
  const value = route.query.redirect;
  return typeof value === "string" && value.startsWith("/") ? value : "/plans";
});

async function onSubmit() {
  loading.value = true;
  try {
    unwrapAuth(await authClient.signIn.email({ email: state.email, password: state.password }));
    await refresh();
    await navigateTo(redirect.value);
  } catch (error) {
    notify.error(error, "errors.INVALID_EMAIL_OR_PASSWORD");
  } finally {
    loading.value = false;
  }
}

async function signInWithMidata() {
  await authClient.signIn.social({ provider: MIDATA_PROVIDER, callbackURL: redirect.value });
}
</script>

<template>
  <div class="space-y-6">
    <div class="text-center space-y-1">
      <h1 class="text-xl font-semibold text-highlighted">{{ t("auth.loginTitle") }}</h1>
      <p class="text-sm text-muted">{{ t("auth.loginSubtitle") }}</p>
    </div>

    <UButton
      v-if="flags.midata"
      :label="t('auth.midata')"
      icon="i-lucide-tent"
      color="neutral"
      variant="outline"
      block
      @click="signInWithMidata"
    />
    <USeparator v-if="flags.midata" :label="t('auth.or')" />

    <UForm :schema="schema" :state="state" class="space-y-4" data-testid="login-form" @submit="onSubmit">
      <UFormField :label="t('fields.email')" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UFormField :label="t('fields.password')" name="password">
        <template #hint>
          <ULink to="/forgot-password" class="text-sm text-primary">{{ t("auth.forgot") }}</ULink>
        </template>
        <UInput v-model="state.password" type="password" autocomplete="current-password" class="w-full" />
      </UFormField>
      <UButton type="submit" :label="t('auth.login')" :loading="loading" block />
    </UForm>

    <p class="text-center text-sm text-muted">
      {{ t("auth.noAccount") }}
      <ULink :to="{ path: '/register', query: route.query }" class="text-primary font-medium">{{ t("auth.register") }}</ULink>
    </p>
  </div>
</template>
