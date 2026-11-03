<script setup lang="ts">
import { renderSVG } from "uqr";
import type { WallDesign, WidgetName } from "~~/shared/wall-design";

export interface WallInfo {
  title: string;
  nextRotationAt: string | null;
  publicUrl: string;
}

// Title, clock, countdown, QR code or free text box on the wall.
const props = defineProps<{ name: WidgetName; design: WallDesign; info: WallInfo }>();
const { t, d, locale } = useI18n();

const now = ref(new Date());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => (timer = setInterval(() => (now.value = new Date()), 1000)));
onBeforeUnmount(() => clearInterval(timer));

const css = computed(() => cardCss(props.design.card));

const clock = computed(() =>
  new Intl.DateTimeFormat(`${locale.value}-CH`, {
    hour: "2-digit",
    minute: "2-digit",
    ...(props.design.widgets.clock.seconds && { second: "2-digit" }),
  }).format(now.value),
);

const countdown = computed(() => {
  if (!props.info.nextRotationAt) return t("dashboard.autoOff");
  const parts = countdownParts(new Date(props.info.nextRotationAt), now.value);
  if (parts.due) return t("dashboard.dueNow");
  const segments: string[] = [];
  if (parts.days) segments.push(t("time.days", parts.days));
  if (parts.hours) segments.push(t("time.hours", parts.hours));
  if (!parts.days) segments.push(t("time.minutes", parts.minutes));
  return t("dashboard.inTime", { time: segments.join(" ") });
});

const qrSvg = computed(() => (props.name === "qr" && props.info.publicUrl ? renderSVG(props.info.publicUrl, { border: 1 }) : ""));
</script>

<template>
  <div class="flex size-full flex-col justify-center overflow-hidden" :style="css" :data-testid="`wall-widget-${name}`">
    <h1 v-if="name === 'title'" class="truncate text-[2.2em] font-extrabold leading-tight">
      {{ design.widgets.title.text || info.title }}
    </h1>

    <template v-else-if="name === 'clock'">
      <ClientOnly>
        <p class="text-[2.4em] font-bold tabular-nums leading-none">{{ clock }}</p>
        <p class="text-[0.85em] opacity-75">{{ d(now, "short") }}</p>
      </ClientOnly>
    </template>

    <template v-else-if="name === 'countdown'">
      <p class="text-[0.85em] uppercase tracking-wide opacity-75">{{ t("dashboard.nextRotation") }}</p>
      <ClientOnly><p class="text-[1.4em] font-bold">{{ countdown }}</p></ClientOnly>
    </template>

    <!-- uqr returns a plain SVG string built from the URL only -->
    <div v-else-if="name === 'qr'" class="mx-auto aspect-square h-full max-w-full [&>svg]:size-full" v-html="qrSvg" />

    <p v-else-if="name === 'text'" class="whitespace-pre-line text-[1.2em] font-semibold">
      {{ design.widgets.text.content || t("designer.textPlaceholder") }}
    </p>
  </div>
</template>
