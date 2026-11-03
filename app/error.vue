<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();
const { t } = useI18n();

const title = computed(() => (props.error.statusCode === 404 ? t("errorPage.notFound") : t("errorPage.title")));
useSeoMeta({ title });
</script>

<template>
  <UApp>
    <UError
      :error="{ ...error, statusMessage: title }"
      :clear="{ label: t('errorPage.back'), to: '/plans' }"
    />
  </UApp>
</template>
