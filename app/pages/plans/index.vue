<script setup lang="ts">
import { z } from "zod";
import type { MidataCampDto } from "~~/shared/types/api";

const { t, d } = useI18n();
useSeoMeta({ title: () => t("nav.plans") });
const route = useRoute();
const notify = useNotify();
const { data: plans, refresh: refreshPlans, status } = useMyPlans();
const { data: flags } = useFeatureFlags();

// ---- create plan ----
const createOpen = ref(route.query.create === "1");
watch(() => route.query.create, (value) => (createOpen.value = value === "1"));
const createState = reactive({ name: "" });
const createSchema = computed(() => z.object({ name: z.string().trim().min(1, t("validation.required")).max(80) }));
const creating = ref(false);

function slugFor(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "plan"}-${crypto.randomUUID().slice(0, 6)}`;
}

async function createPlan() {
  creating.value = true;
  try {
    const plan = unwrapAuth(
      await authClient.organization.create({ name: createState.name.trim(), slug: slugFor(createState.name) }),
    );
    await refreshPlans();
    createOpen.value = false;
    createState.name = "";
    await navigateTo(`/plans/${plan.id}`);
  } catch (error) {
    notify.error(error);
  } finally {
    creating.value = false;
  }
}

// ---- MiData import ----
const camps = ref<MidataCampDto[]>([]);
const campsState = ref<"idle" | "loading" | "ready" | "notLinked" | "error">("idle");
const importing = ref<string | null>(null);

async function loadCamps() {
  campsState.value = "loading";
  try {
    camps.value = await plainFetch<MidataCampDto[]>("/api/midata/camps");
    campsState.value = "ready";
  } catch (error) {
    campsState.value = errorCode(error) === "MIDATA_NOT_LINKED" ? "notLinked" : "error";
  }
}

async function linkMidata() {
  await authClient.linkSocial({ provider: MIDATA_PROVIDER, callbackURL: "/plans" });
}

async function importCamp(camp: MidataCampDto) {
  importing.value = camp.id;
  try {
    const result = await plainFetch<{ planId: string; importedMembers: number }>(`/api/midata/camps/${camp.id}/import`, {
      method: "POST",
    });
    notify.success("plans.imported", { count: result.importedMembers });
    await refreshPlans();
    await navigateTo(`/plans/${result.planId}/groups`);
  } catch (error) {
    notify.error(error);
  } finally {
    importing.value = null;
  }
}

onMounted(() => {
  if (flags.value.midata) loadCamps();
});
</script>

<template>
  <UDashboardPanel id="plans">
    <template #header>
      <UDashboardNavbar :title="t('nav.plans')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton :label="t('plans.create')" icon="i-lucide-plus" data-testid="create-plan" @click="createOpen = true" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UEmpty
        v-if="status !== 'pending' && plans.length === 0"
        icon="i-lucide-tent"
        :title="t('plans.emptyTitle')"
        :description="t('plans.emptyText')"
        :actions="[{ label: t('plans.create'), icon: 'i-lucide-plus', onClick: () => (createOpen = true) }]"
      />

      <UPageGrid v-else class="sm:grid-cols-2 xl:grid-cols-3">
        <UPageCard
          v-for="plan in plans"
          :key="plan.id"
          :title="plan.name"
          icon="i-lucide-tent"
          :to="`/plans/${plan.id}`"
          variant="subtle"
          data-testid="plan-card"
        />
      </UPageGrid>

      <UPageCard
        v-if="flags.midata"
        :title="t('plans.midataTitle')"
        :description="t('plans.midataText')"
        icon="i-lucide-download"
        variant="outline"
        class="mt-8"
      >
        <div v-if="campsState === 'loading'" class="space-y-2">
          <USkeleton v-for="i in 3" :key="i" class="h-10 w-full" />
        </div>
        <div v-else-if="campsState === 'notLinked'" class="flex flex-wrap items-center gap-3">
          <span class="text-sm text-muted">{{ t("plans.midataNotLinked") }}</span>
          <UButton :label="t('plans.midataLink')" icon="i-lucide-link" variant="subtle" @click="linkMidata" />
        </div>
        <UAlert v-else-if="campsState === 'error'" color="error" variant="subtle" :title="t('errors.MIDATA_UNAVAILABLE')" />
        <p v-else-if="campsState === 'ready' && camps.length === 0" class="text-sm text-muted">{{ t("plans.midataNoCamps") }}</p>
        <ul v-else-if="campsState === 'ready'" class="divide-y divide-default">
          <li v-for="camp in camps" :key="camp.id" class="flex items-center justify-between gap-3 py-2">
            <div class="min-w-0">
              <p class="font-medium text-highlighted truncate">{{ camp.name }}</p>
              <p v-if="camp.startsAt" class="text-xs text-muted">
                {{ d(new Date(camp.startsAt), "short") }}<template v-if="camp.endsAt"> – {{ d(new Date(camp.endsAt), "short") }}</template>
              </p>
            </div>
            <UButton
              :label="t('plans.import')"
              size="sm"
              variant="subtle"
              :loading="importing === camp.id"
              :disabled="importing !== null"
              @click="importCamp(camp)"
            />
          </li>
        </ul>
      </UPageCard>

      <UModal v-model:open="createOpen" :title="t('plans.create')" :description="t('plans.createText')">
        <template #body>
          <UForm :schema="createSchema" :state="createState" class="space-y-4" data-testid="create-plan-form" @submit="createPlan">
            <UFormField :label="t('fields.planName')" name="name">
              <UInput v-model="createState.name" :placeholder="t('plans.namePlaceholder')" class="w-full" autofocus />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton :label="t('actions.cancel')" color="neutral" variant="subtle" @click="createOpen = false" />
              <UButton type="submit" :label="t('actions.create')" :loading="creating" />
            </div>
          </UForm>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
