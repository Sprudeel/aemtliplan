<script setup lang="ts">
import type { Background } from "~~/shared/wall-design";

// Full-size background layer of the wall (illustration, image, color, gradient or pattern).
const props = defineProps<{ background: Background; imageUrl?: string | null }>();
const colorMode = useColorMode();

const night = computed(() =>
  props.background.illustrationMode === "night" ||
  (props.background.illustrationMode === "auto" && colorMode.value === "dark"),
);


const layerStyle = computed<Record<string, string>>(() => {
  const bg = props.background;
  const style: Record<string, string> = { filter: bg.blur ? `blur(${bg.blur}px)` : "none" };
  switch (bg.kind) {
    case "illustration":
      style.backgroundImage = `url('/backgrounds/camp-${night.value ? "night" : "day"}.svg')`;
      style.backgroundSize = "cover";
      style.backgroundPosition = "center bottom";
      break;
    case "image":
      style.backgroundImage = props.imageUrl ? `url('${props.imageUrl}')` : "none";
      style.backgroundColor = bg.color;
      style.backgroundSize = "cover";
      style.backgroundPosition = "center";
      break;
    case "color":
      style.backgroundColor = bg.color;
      break;
    case "gradient":
      style.backgroundImage = `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})`;
      break;
    case "pattern":
      style.backgroundColor = bg.color;
      style.backgroundImage = patternImage(bg.pattern, bg.patternColor);
      style.backgroundSize = `${Math.round((bg.pattern === "topo" ? 240 : 28) * bg.patternScale)}px`;
      break;
  }
  return style;
});
</script>

<template>
  <div class="absolute inset-0 overflow-hidden" aria-hidden="true" data-testid="wall-background" :data-kind="background.kind">
    <!-- slightly oversized so a blurred edge never shows -->
    <div class="absolute -inset-6" :style="layerStyle" />
    <div
      v-if="background.overlayOpacity > 0"
      class="absolute inset-0"
      :style="{ backgroundColor: hexToRgba(background.overlayColor, background.overlayOpacity) }"
    />
  </div>
</template>
