<script setup lang="ts">
import { CARD_PRESET_STYLES, CARD_PRESETS, FONTS, type CardStyle } from "~~/shared/wall-design";
import type { WallDesigner } from "~/composables/useWallDesigner";

// Look of all cards and widgets: presets, colors, glass, corners, shadow, font.
const props = defineProps<{ designer: WallDesigner }>();
const { t } = useI18n();

function field<K extends keyof CardStyle>(name: K) {
  return computed<CardStyle[K]>({
    get: () => props.designer.design.value.card[name],
    set: (value) => props.designer.edit((draft) => void (draft.card[name] = value), true),
  });
}
const background = field("background");
const text = field("text");
const opacity = field("opacity");
const blur = field("blur");
const radius = field("radius");
const fontScale = field("fontScale");
const shadow = field("shadow");
const font = field("font");
const groupColor = field("groupColor");
const align = field("align");
const showIcon = field("showIcon");
const showDescription = field("showDescription");
const showMembers = field("showMembers");
const border = field("border");

const shadowItems = computed(() => (["none", "soft", "strong"] as const).map((value) => ({ value, label: t(`designer.shadow.${value}`) })));
const groupColorItems = computed(() => (["chip", "stripe", "fill"] as const).map((value) => ({ value, label: t(`designer.groupColor.${value}`) })));
const alignItems = computed(() => (["left", "center"] as const).map((value) => ({ value, label: t(`designer.align.${value}`) })));
</script>

<template>
  <div class="space-y-5">
    <UFormField :label="t('designer.presets')">
      <div class="grid grid-cols-3 gap-2" data-testid="card-presets">
        <button
          v-for="preset in CARD_PRESETS"
          :key="preset"
          type="button"
          class="rounded-lg border p-2 text-xs font-semibold transition"
          :class="designer.design.value.card.preset === preset ? 'border-primary ring-2 ring-primary/30' : 'border-default hover:border-primary/50'"
          :style="{ backgroundColor: CARD_PRESET_STYLES[preset].background, color: CARD_PRESET_STYLES[preset].text }"
          :data-preset="preset"
          @click="designer.applyPreset(preset)"
        >
          {{ t(`designer.preset.${preset}`) }}
        </button>
      </div>
    </UFormField>

    <div class="grid grid-cols-2 gap-3">
      <DesignerColorField v-model="background" :label="t('designer.cardColor')" />
      <DesignerColorField v-model="text" :label="t('designer.textColor')" />
    </div>
    <DesignerSliderField v-model="opacity" :label="t('designer.opacity')" :min="0" :max="1" :step="0.05" />
    <DesignerSliderField v-model="blur" :label="t('designer.glass')" :min="0" :max="24" unit="px" />
    <DesignerSliderField v-model="radius" :label="t('designer.radius')" :min="0" :max="40" unit="px" />
    <DesignerSliderField v-model="fontScale" :label="t('designer.fontScale')" :min="0.6" :max="2" :step="0.05" unit="×" />

    <div class="grid grid-cols-2 gap-3">
      <UFormField :label="t('designer.font')">
        <USelect v-model="font" :items="[...FONTS]" size="sm" class="w-full" />
      </UFormField>
      <UFormField :label="t('designer.shadowLabel')">
        <USelect v-model="shadow" :items="shadowItems" size="sm" class="w-full" />
      </UFormField>
      <UFormField :label="t('designer.groupColorLabel')">
        <USelect v-model="groupColor" :items="groupColorItems" size="sm" class="w-full" />
      </UFormField>
      <UFormField :label="t('designer.alignLabel')">
        <USelect v-model="align" :items="alignItems" size="sm" class="w-full" />
      </UFormField>
    </div>

    <div class="space-y-2">
      <USwitch v-model="showIcon" :label="t('designer.showIcon')" />
      <USwitch v-model="showDescription" :label="t('designer.showDescription')" />
      <USwitch v-model="showMembers" :label="t('designer.showMembers')" :description="t('designer.showMembersHint')" />
      <USwitch v-model="border" :label="t('designer.border')" />
    </div>
  </div>
</template>
