<script setup lang="ts">
import { WIDGETS, type WidgetName } from "~~/shared/wall-design";
import type { WallDesigner } from "~/composables/useWallDesigner";

// Turn widgets on/off and set their options. New widgets get an automatic position.
const props = defineProps<{ designer: WallDesigner }>();
const { t } = useI18n();
const widgets = computed(() => props.designer.design.value.widgets);

function setEnabled(name: WidgetName, value: boolean) {
  props.designer.edit((draft) => void (draft.widgets[name].enabled = value));
  if (value) props.designer.selected.value = `widget:${name}`;
}
const titleText = computed({
  get: () => widgets.value.title.text,
  set: (value: string) => props.designer.edit((draft) => void (draft.widgets.title.text = value), true),
});
const clockSeconds = computed({
  get: () => widgets.value.clock.seconds,
  set: (value: boolean) => props.designer.edit((draft) => void (draft.widgets.clock.seconds = value)),
});
const textContent = computed({
  get: () => widgets.value.text.content,
  set: (value: string) => props.designer.edit((draft) => void (draft.widgets.text.content = value), true),
});
const icons: Record<WidgetName, string> = {
  title: "i-lucide-heading",
  clock: "i-lucide-clock",
  countdown: "i-lucide-timer",
  qr: "i-lucide-qr-code",
  text: "i-lucide-sticky-note",
};
</script>

<template>
  <ul class="space-y-4" data-testid="widgets-panel">
    <li v-for="name in WIDGETS" :key="name" class="space-y-2 rounded-lg border border-default p-3">
      <div class="flex items-center justify-between gap-2">
        <span class="flex items-center gap-2 font-medium text-highlighted">
          <UIcon :name="icons[name]" class="size-4" />{{ t(`designer.widget.${name}`) }}
        </span>
        <USwitch
          :model-value="widgets[name].enabled"
          :aria-label="t(`designer.widget.${name}`)"
          :data-testid="`widget-toggle-${name}`"
          @update:model-value="(value) => setEnabled(name, Boolean(value))"
        />
      </div>
      <UInput v-if="name === 'title' && widgets.title.enabled" v-model="titleText" :placeholder="t('designer.titlePlaceholder')" size="sm" class="w-full" />
      <USwitch v-if="name === 'clock' && widgets.clock.enabled" v-model="clockSeconds" :label="t('designer.seconds')" size="sm" />
      <UTextarea
        v-if="name === 'text' && widgets.text.enabled"
        v-model="textContent"
        :placeholder="t('designer.textPlaceholder')"
        :maxlength="300"
        :rows="3"
        size="sm"
        class="w-full"
      />
      <p v-if="name === 'qr' && widgets.qr.enabled" class="text-xs text-muted">{{ t("designer.qrHint") }}</p>
    </li>
  </ul>
</template>
