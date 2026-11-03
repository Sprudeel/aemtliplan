<script setup lang="ts">
import type { PublicPlanDto } from "~~/shared/types/api";
import { pickScreenSize, type ScreenSize } from "~~/shared/wall-design";

definePageMeta({ layout: "wall", public: true });

const { t } = useI18n();
const route = useRoute();
const requestUrl = useRequestURL();
const slug = computed(() => String(route.params.slug));

const { data, refresh, error } = await useFetch<PublicPlanDto>(() => `/api/public/${slug.value}`);
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: t("wall.notFound"), fatal: true });
}

useSeoMeta({ title: () => data.value?.name ?? t("app.name"), robots: "noindex" });

const { connected } = useLiveRefresh(() => `/api/public/${slug.value}/events`, () => refresh());

// Layout per screen size: follow the window width (browser only).
const size = ref<ScreenSize>("desktop");
function updateSize() {
  size.value = pickScreenSize(window.innerWidth);
}
onMounted(() => {
  updateSize();
  window.addEventListener("resize", updateSize);
});
onBeforeUnmount(() => window.removeEventListener("resize", updateSize));

const info = computed(() => ({
  title: data.value?.name ?? "",
  nextRotationAt: data.value?.nextRotationAt ?? null,
  publicUrl: `${requestUrl.origin}/p/${slug.value}`,
}));
</script>

<template>
  <div class="relative h-svh w-screen overflow-hidden bg-default" data-testid="wall-page">
    <ClientOnly>
      <WallCanvas
        v-if="data"
        :design="data.design"
        :items="data.items"
        :size="size"
        :info="info"
        :image-url="data.backgroundUrl"
      />
      <template #fallback>
        <div class="absolute inset-0 bg-[url('/backgrounds/camp-day.svg')] bg-cover bg-bottom" />
      </template>
    </ClientOnly>

    <p v-if="data && !data.items.length" class="absolute inset-x-0 top-1/2 text-center text-lg font-semibold" data-testid="wall-empty">
      {{ t("wall.empty") }}
    </p>

    <UBadge
      :label="connected ? t('wall.live') : t('wall.offline')"
      :color="connected ? 'success' : 'neutral'"
      :icon="connected ? 'i-lucide-radio' : 'i-lucide-wifi-off'"
      variant="soft"
      size="sm"
      class="absolute bottom-2 right-2 z-[1000] opacity-70"
      data-testid="wall-status"
    />
  </div>
</template>
