<script setup lang="ts">
import { z } from "zod";
import type { IdlePolicy, SettingsDto } from "~~/shared/types/api";

const { t, d } = useI18n();
useSeoMeta({ title: () => t("nav.settingsGeneral") });
const { plan, refresh } = usePlan();
const api = usePlanApiBase();
const planId = usePlanId();
const notify = useNotify();

// ---- plan name ----
const nameState = reactive({ name: plan.value?.name ?? "" });
const nameSchema = computed(() => z.object({ name: z.string().trim().min(1, t("validation.required")).max(80) }));
async function saveName() {
  const ok = await notify.run(async () => {
    unwrapAuth(await authClient.organization.update({ organizationId: planId.value, data: { name: nameState.name.trim() } }));
  }, "settings.saved");
  if (ok) await refreshNuxtData();
}

// ---- schedule + rotation rule ----
const schedule = reactive({
  rotationEnabled: plan.value?.settings.rotationEnabled ?? false,
  rotationTime: plan.value?.settings.rotationTime ?? "17:00",
  timezone: plan.value?.settings.timezone ?? "Europe/Zurich",
  idlePolicy: (plan.value?.settings.idlePolicy ?? "slots") as IdlePolicy,
});
const timeZones = Intl.supportedValuesOf?.("timeZone") ?? ["Europe/Zurich"];
const policyItems = computed(() => [
  { value: "slots", label: t("settings.policySlots"), description: t("settings.policySlotsText") },
  { value: "fair", label: t("settings.policyFair"), description: t("settings.policyFairText") },
]);
const savingSchedule = ref(false);

async function saveSchedule() {
  savingSchedule.value = true;
  const ok = await notify.run(
    () => plainFetch<SettingsDto>(`${api.value}/settings`, { method: "PATCH", body: { ...schedule } }),
    "settings.saved",
  );
  savingSchedule.value = false;
  if (ok) await refresh();
}

// ---- delete plan ----
const deleteOpen = ref(false);
const deleting = ref(false);
async function deletePlan() {
  deleting.value = true;
  try {
    unwrapAuth(await authClient.organization.delete({ organizationId: planId.value }));
    await refreshNuxtData("my-plans");
    await navigateTo("/plans");
  } catch (error) {
    notify.error(error);
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <UPageCard :title="t('settings.planName')" variant="subtle">
    <UForm :schema="nameSchema" :state="nameState" class="flex flex-wrap items-start gap-2" @submit="saveName">
      <UFormField name="name" class="flex-1 min-w-48">
        <UInput v-model="nameState.name" class="w-full" />
      </UFormField>
      <UButton type="submit" :label="t('actions.save')" />
    </UForm>
  </UPageCard>

  <UPageCard :title="t('settings.schedule')" :description="t('settings.scheduleText')" variant="subtle">
    <form class="space-y-5" data-testid="schedule-form" @submit.prevent="saveSchedule">
      <USwitch v-model="schedule.rotationEnabled" :label="t('settings.autoRotation')" data-testid="auto-rotation" />
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField :label="t('settings.time')">
          <UInput v-model="schedule.rotationTime" type="time" :disabled="!schedule.rotationEnabled" class="w-full" data-testid="rotation-time" />
        </UFormField>
        <UFormField :label="t('settings.timezone')">
          <USelectMenu v-model="schedule.timezone" :items="timeZones" :disabled="!schedule.rotationEnabled" class="w-full" />
        </UFormField>
      </div>
      <p v-if="plan?.nextRotationAt" class="text-sm text-muted">
        {{ t("settings.nextRun", { date: d(new Date(plan.nextRotationAt), "long") }) }}
      </p>

      <UFormField :label="t('settings.idlePolicy')" :description="t('settings.idlePolicyText')">
        <URadioGroup v-model="schedule.idlePolicy" :items="policyItems" variant="card" class="mt-2" />
      </UFormField>

      <UButton type="submit" :label="t('actions.save')" :loading="savingSchedule" />
    </form>
  </UPageCard>

  <UPageCard :title="t('settings.danger')" variant="outline" class="border-error/40">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted">{{ t("settings.deletePlanText") }}</p>
      <UButton :label="t('settings.deletePlan')" color="error" variant="subtle" @click="deleteOpen = true" />
    </div>
  </UPageCard>

  <ConfirmModal
    v-model:open="deleteOpen"
    :title="t('settings.deletePlan')"
    :description="t('settings.deletePlanConfirm', { name: plan?.name })"
    :loading="deleting"
    @confirm="deletePlan"
  />
</template>
