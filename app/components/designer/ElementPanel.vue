<script setup lang="ts">
import type { LayoutItem } from "~~/shared/wall-design";
import type { WallDesigner } from "~/composables/useWallDesigner";

// Position, size, rotation, layer and visibility of the selected element + list of all elements.
const props = defineProps<{ designer: WallDesigner; labels: Map<string, string> }>();
const { t } = useI18n();

const current = computed(() => (props.designer.selected.value ? props.designer.layout.value.items[props.designer.selected.value] : undefined));
const field = (name: keyof LayoutItem) =>
  computed({
    get: () => Number(current.value?.[name] ?? 0),
    set: (value: number) => props.designer.patchSelected({ [name]: Number(value) }),
  });
const x = field("x");
const y = field("y");
const w = field("w");
const h = field("h");
const rotate = field("rotate");

function toFront() {
  const max = Math.max(...Object.values(props.designer.layout.value.items).map((item) => item.z));
  props.designer.patchSelected({ z: Math.min(999, max + 1) });
}
function toBack() {
  props.designer.patchSelected({ z: 0 });
}
function center() {
  if (current.value) props.designer.patchSelected({ x: (100 - current.value.w) / 2 });
}
function toggleHidden(key: string) {
  const item = props.designer.layout.value.items[key];
  if (item) props.designer.updateItem(key, { ...item, hidden: !item.hidden }, false);
}
</script>

<template>
  <div class="space-y-5">
    <div v-if="current && designer.selected.value" class="space-y-4" data-testid="element-inspector">
      <p class="font-semibold text-highlighted">{{ labels.get(designer.selected.value) }}</p>
      <div class="grid grid-cols-2 gap-3">
        <UFormField :label="t('designer.x')"><UInputNumber v-model="x" :min="0" :max="100" :step="0.5" size="sm" data-testid="input-x" /></UFormField>
        <UFormField :label="t('designer.y')"><UInputNumber v-model="y" :min="0" :max="100" :step="0.5" size="sm" data-testid="input-y" /></UFormField>
        <UFormField :label="t('designer.width')"><UInputNumber v-model="w" :min="5" :max="100" :step="0.5" size="sm" /></UFormField>
        <UFormField :label="t('designer.height')"><UInputNumber v-model="h" :min="4" :max="100" :step="0.5" size="sm" /></UFormField>
      </div>
      <DesignerSliderField v-model="rotate" :label="t('designer.rotate')" :min="-45" :max="45" unit="°" />
      <div class="flex flex-wrap gap-2">
        <UButton :label="t('designer.toFront')" icon="i-lucide-bring-to-front" size="xs" color="neutral" variant="subtle" @click="toFront" />
        <UButton :label="t('designer.toBack')" icon="i-lucide-send-to-back" size="xs" color="neutral" variant="subtle" @click="toBack" />
        <UButton :label="t('designer.center')" icon="i-lucide-align-center-horizontal" size="xs" color="neutral" variant="subtle" @click="center" />
        <UButton
          :label="current.hidden ? t('designer.show') : t('designer.hide')"
          :icon="current.hidden ? 'i-lucide-eye' : 'i-lucide-eye-off'"
          size="xs"
          color="neutral"
          variant="subtle"
          @click="toggleHidden(designer.selected.value!)"
        />
      </div>
      <p class="text-xs text-muted">{{ t("designer.keyboardHint") }}</p>
    </div>
    <p v-else class="text-sm text-muted">{{ t("designer.selectHint") }}</p>

    <USeparator />

    <ul class="space-y-1" data-testid="element-list">
      <li v-for="key in designer.keys.value" :key="key" class="flex items-center gap-2">
        <UButton
          :label="labels.get(key)"
          size="xs"
          color="neutral"
          :variant="designer.selected.value === key ? 'soft' : 'ghost'"
          class="flex-1 justify-start"
          @click="designer.selected.value = key"
        />
        <UButton
          :icon="designer.layout.value.items[key]?.hidden ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          size="xs"
          color="neutral"
          variant="ghost"
          :aria-label="t('designer.toggleVisible', { name: labels.get(key) })"
          @click="toggleHidden(key)"
        />
      </li>
    </ul>
  </div>
</template>
