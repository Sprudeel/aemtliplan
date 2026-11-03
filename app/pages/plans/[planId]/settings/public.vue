<script setup lang="ts">
const MAX_BYTES = 10 * 1024 * 1024;

const { t } = useI18n();
useSeoMeta({ title: () => t("nav.settingsPublic") });
const { plan, refresh } = usePlan();
const api = usePlanApiBase();
const planId = usePlanId();
const notify = useNotify();
const requestUrl = useRequestURL();

const settings = computed(() => plan.value?.settings);
const publicUrl = computed(() => (settings.value ? `${requestUrl.origin}/p/${settings.value.publicSlug}` : ""));

async function patch(body: Record<string, unknown>) {
  const ok = await notify.run(() => plainFetch(`${api.value}/settings`, { method: "PATCH", body }), "settings.saved");
  if (ok) await refresh();
}

async function copyLink() {
  await navigator.clipboard.writeText(publicUrl.value);
  notify.success("settings.linkCopied");
}

// ---- background ----
const file = ref<File | null>(null);
const uploading = ref(false);
async function upload() {
  if (!file.value) return;
  if (file.value.size > MAX_BYTES) {
    notify.error({ code: "FILE_TOO_LARGE" });
    return;
  }
  uploading.value = true;
  const form = new FormData();
  form.append("file", file.value);
  const ok = await notify.run(() => plainFetch(`${api.value}/background`, { method: "PUT", body: form }), "settings.backgroundSaved");
  uploading.value = false;
  if (ok) {
    file.value = null;
    await refresh();
  }
}
async function removeBackground() {
  const ok = await notify.run(() => plainFetch(`${api.value}/background`, { method: "DELETE" }), "settings.backgroundRemoved");
  if (ok) await refresh();
}
</script>

<template>
  <UPageCard v-if="settings" :title="t('settings.publicView')" :description="t('settings.publicViewText')" variant="subtle">
    <USwitch
      :model-value="settings.visibility === 'public'"
      :label="t('settings.isPublic')"
      data-testid="public-switch"
      @update:model-value="(value) => patch({ visibility: value ? 'public' : 'private' })"
    />
    <div v-if="settings.visibility === 'public'" class="flex flex-wrap items-center gap-2">
      <UInput :model-value="publicUrl" readonly class="flex-1 min-w-64" data-testid="public-url" />
      <UButton icon="i-lucide-copy" color="neutral" variant="subtle" :aria-label="t('settings.copyLink')" @click="copyLink" />
      <UButton icon="i-lucide-external-link" color="neutral" variant="subtle" :to="publicUrl" target="_blank" :aria-label="t('settings.openLink')" />
    </div>
    <USwitch
      :model-value="settings.showMemberNames"
      :label="t('settings.showNames')"
      :description="t('settings.showNamesText')"
      @update:model-value="(value) => patch({ showMemberNames: value })"
    />
  </UPageCard>

  <UPageCard
    :title="t('designer.title')"
    :description="t('designer.teaser')"
    icon="i-lucide-palette"
    variant="outline"
    :to="`/plans/${planId}/wall`"
    data-testid="open-designer"
  />

  <UPageCard v-if="settings" :title="t('settings.background')" :description="t('settings.backgroundText')" variant="subtle">
    <img v-if="settings.backgroundUrl" :src="settings.backgroundUrl" alt="" class="max-h-48 w-full rounded-md object-cover">
    <UFileUpload
      v-model="file"
      accept="image/png,image/jpeg,image/webp"
      :label="t('settings.chooseImage')"
      :description="t('settings.imageHint')"
      class="w-full min-h-32"
    />
    <div class="flex gap-2">
      <UButton :label="t('settings.upload')" icon="i-lucide-upload" :disabled="!file" :loading="uploading" @click="upload" />
      <UButton
        v-if="settings.backgroundUrl"
        :label="t('settings.removeBackground')"
        color="neutral"
        variant="subtle"
        @click="removeBackground"
      />
    </div>
  </UPageCard>
</template>
