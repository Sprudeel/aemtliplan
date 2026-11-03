<script setup lang="ts">
import type { DropdownMenuItem, TabsItem } from "@nuxt/ui";
import type { PublicItemDto } from "~~/shared/types/api";
import { SCREEN_SIZES, SIZE_SPECS, WIDGETS, type ScreenSize, type WallDesign } from "~~/shared/wall-design";

const { t } = useI18n();
useSeoMeta({ title: () => t("designer.title") });
const { plan, isAdmin, refresh: refreshPlan } = usePlan();
const api = usePlanApiBase();
const planId = usePlanId();
const notify = useNotify();
const requestFetch = useRequestFetch();
const requestUrl = useRequestURL();

const { data: stored } = await useAsyncData(
  () => `plan:${planId.value}:wall-design`,
  () => requestFetch<WallDesign>(`${api.value}/wall-design`),
);
const { data: jobs } = usePlanJobs();
const { data: assignments } = usePlanAssignments();

/** Ämtli as the public wall would show them (member names only if public names are on). */
const items = computed<PublicItemDto[]>(() => {
  const groupByJob = new Map(assignments.value.map((entry) => [entry.jobId, entry.group]));
  return jobs.value.map((job) => {
    const group = groupByJob.get(job.id);
    return {
      key: `job:${job.id}`,
      job: { name: job.name, icon: job.icon, description: job.description },
      group: group
        ? {
            name: group.name,
            color: group.color,
            ...(plan.value?.settings.showMemberNames && { members: group.members.map((m) => m.name) }),
          }
        : null,
    };
  });
});

const labels = computed(() => {
  const map = new Map<string, string>();
  for (const item of items.value) map.set(item.key, item.job.name);
  for (const name of WIDGETS) map.set(`widget:${name}`, t(`designer.widget.${name}`));
  return map;
});

const designer = useWallDesigner(stored.value!, items);
const { design, size, selected, snapStep, dirty, inheritedFrom } = designer;

const publicUrl = computed(() => (plan.value ? `${requestUrl.origin}/p/${plan.value.settings.publicSlug}` : ""));
const info = computed(() => ({
  title: plan.value?.name ?? "",
  nextRotationAt: plan.value?.nextRotationAt ?? null,
  publicUrl: publicUrl.value,
}));

// ---------- toolbar ----------
const sizeIcons: Record<ScreenSize, string> = {
  phone: "i-lucide-smartphone",
  tablet: "i-lucide-tablet",
  desktop: "i-lucide-monitor",
  tv: "i-lucide-tv",
};
const sizeTabs = computed<TabsItem[]>(() =>
  SCREEN_SIZES.map((value) => ({ label: t(`designer.size.${value}`), icon: sizeIcons[value], value })),
);
const snapItems = computed(() => [
  { label: t("designer.snapOff"), value: 0 },
  { label: "1 %", value: 1 },
  { label: "2.5 %", value: 2.5 },
  { label: "5 %", value: 5 },
]);
const layoutActions = computed<DropdownMenuItem[][]>(() => [
  [{ label: t("designer.autoArrange"), icon: "i-lucide-layout-grid", onSelect: designer.autoArrange }],
  SCREEN_SIZES.filter((other) => other !== size.value).map((other) => ({
    label: t("designer.copyFrom", { size: t(`designer.size.${other}`) }),
    icon: sizeIcons[other],
    onSelect: () => designer.copyFrom(other),
  })),
  [{ label: t("designer.resetSize"), icon: "i-lucide-rotate-ccw", color: "error" as const, onSelect: designer.resetSize }],
]);

// ---------- canvas frame scaled to the available area ----------
const area = ref<HTMLElement | null>(null);
const areaSize = ref({ width: 800, height: 600 });
let observer: ResizeObserver | undefined;
onMounted(() => {
  if (!area.value) return;
  observer = new ResizeObserver(([entry]) => {
    if (entry) areaSize.value = { width: entry.contentRect.width, height: entry.contentRect.height };
  });
  observer.observe(area.value);
});
onBeforeUnmount(() => observer?.disconnect());
const frame = computed(() => {
  const spec = SIZE_SPECS[size.value];
  const scale = Math.min((areaSize.value.width - 32) / spec.width, (areaSize.value.height - 32) / spec.height, 1);
  return { width: `${Math.max(120, spec.width * scale)}px`, height: `${Math.max(120, spec.height * scale)}px` };
});

// ---------- inspector ----------
const panelTabs = computed<TabsItem[]>(() => [
  { label: t("designer.tabElement"), icon: "i-lucide-move", slot: "element" as const, value: "element" },
  { label: t("designer.tabCards"), icon: "i-lucide-square-stack", slot: "cards" as const, value: "cards" },
  { label: t("designer.tabBackground"), icon: "i-lucide-image", slot: "background" as const, value: "background" },
  { label: t("designer.tabWidgets"), icon: "i-lucide-puzzle", slot: "widgets" as const, value: "widgets" },
]);
const panel = ref("element");
watch(selected, (key) => key && (panel.value = "element"));

// ---------- save / undo ----------
const saving = ref(false);
async function save() {
  saving.value = true;
  try {
    const result = await plainFetch<WallDesign>(`${api.value}/wall-design`, { method: "PUT", body: design.value });
    designer.markSaved(result);
    notify.success("designer.saved");
  } catch (error) {
    notify.error(error);
  } finally {
    saving.value = false;
  }
}

function onKeydown(event: KeyboardEvent) {
  const mod = event.metaKey || event.ctrlKey;
  if (mod && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) designer.redo();
    else designer.undo();
  } else if (mod && event.key.toLowerCase() === "s") {
    event.preventDefault();
    save();
  }
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

onBeforeRouteLeave(() => {
  if (dirty.value && !window.confirm(t("designer.leaveConfirm"))) return false;
});
</script>

<template>
  <UDashboardPanel id="wall-designer" :ui="{ body: 'p-0 sm:p-0 gap-0' }">
    <template #header>
      <UDashboardNavbar :title="t('designer.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-undo-2" color="neutral" variant="ghost" :disabled="!designer.canUndo.value" :aria-label="t('designer.undo')" @click="designer.undo" />
          <UButton icon="i-lucide-redo-2" color="neutral" variant="ghost" :disabled="!designer.canRedo.value" :aria-label="t('designer.redo')" @click="designer.redo" />
          <UButton
            v-if="plan?.settings.visibility === 'public'"
            icon="i-lucide-external-link"
            :label="t('designer.openWall')"
            color="neutral"
            variant="subtle"
            :to="publicUrl"
            target="_blank"
            class="hidden sm:inline-flex"
          />
          <UButton
            :label="dirty ? t('designer.save') : t('designer.savedLabel')"
            icon="i-lucide-save"
            :loading="saving"
            :disabled="!dirty || !isAdmin"
            data-testid="designer-save"
            @click="save"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <div class="flex w-full flex-wrap items-center justify-between gap-2 py-1">
          <UTabs
            v-model="size"
            :items="sizeTabs"
            :content="false"
            size="sm"
            variant="pill"
            data-testid="size-tabs"
          />
          <div class="flex items-center gap-2">
            <UBadge
              :label="inheritedFrom === null ? t('designer.ownLayout') : inheritedFrom === 'auto' ? t('designer.autoLayout') : t('designer.inherited', { size: t(`designer.size.${inheritedFrom}`) })"
              :color="inheritedFrom === null ? 'success' : 'neutral'"
              variant="subtle"
              data-testid="layout-source"
            />
            <USelect v-model="snapStep" :items="snapItems" size="sm" icon="i-lucide-magnet" class="w-28" :aria-label="t('designer.snap')" />
            <UDropdownMenu :items="layoutActions" :content="{ align: 'end' }">
              <UButton :label="t('designer.layout')" icon="i-lucide-layout-dashboard" trailing-icon="i-lucide-chevron-down" size="sm" color="neutral" variant="subtle" />
            </UDropdownMenu>
          </div>
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert v-if="!isAdmin" class="m-4" color="neutral" variant="subtle" icon="i-lucide-lock" :title="t('settings.adminOnly')" />
      <UAlert
        v-else-if="plan?.settings.visibility !== 'public'"
        class="m-4 mb-0"
        color="secondary"
        variant="subtle"
        icon="i-lucide-eye-off"
        :title="t('designer.notPublic')"
        :actions="[{ label: t('nav.settingsPublic'), to: `/plans/${planId}/settings/public`, color: 'neutral', variant: 'outline' }]"
      />

      <div v-if="isAdmin" class="flex min-h-0 flex-1 flex-col lg:flex-row">
        <!-- canvas -->
        <div
          ref="area"
          class="flex min-h-[60svh] flex-1 items-center justify-center bg-[repeating-conic-gradient(var(--ui-bg-muted)_0_25%,var(--ui-bg)_0_50%)] bg-[length:24px_24px] p-4 lg:min-h-0"
        >
          <ClientOnly>
            <div class="relative shrink-0 overflow-hidden rounded-lg shadow-xl ring ring-default" :style="frame" data-testid="designer-frame">
              <WallCanvas
                :design="design"
                :items="items"
                :size="size"
                :info="info"
                :image-url="plan?.settings.backgroundUrl"
                editable
                :selected="selected"
                :snap-step="snapStep"
                @select="(key) => (selected = key)"
                @update="(key, item) => designer.updateItem(key, item)"
              />
            </div>
          </ClientOnly>
        </div>

        <!-- inspector -->
        <aside class="w-full shrink-0 overflow-y-auto border-default p-4 lg:w-96 lg:border-l" data-testid="designer-inspector">
          <UTabs v-model="panel" :items="panelTabs" size="sm" class="w-full" :ui="{ list: 'w-full', trigger: 'flex-1 justify-center px-1' }">
            <template #element>
              <DesignerElementPanel :designer="designer" :labels="labels" class="pt-4" />
            </template>
            <template #cards>
              <DesignerCardPanel :designer="designer" class="pt-4" />
            </template>
            <template #background>
              <DesignerBackgroundPanel :designer="designer" :image-url="plan?.settings.backgroundUrl ?? null" class="pt-4" @uploaded="refreshPlan()" />
            </template>
            <template #widgets>
              <DesignerWidgetsPanel :designer="designer" class="pt-4" />
            </template>
          </UTabs>
        </aside>
      </div>
    </template>
  </UDashboardPanel>
</template>
