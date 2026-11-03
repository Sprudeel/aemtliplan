<script setup lang="ts">
import { PATTERNS, type Background } from "~~/shared/wall-design";
import type { WallDesigner } from "~/composables/useWallDesigner";

// Background: camp illustration, own image, color, gradient or pattern + overlay and blur.
const props = defineProps<{ designer: WallDesigner; imageUrl: string | null }>();
const emit = defineEmits<{ uploaded: [] }>();
const { t } = useI18n();
const api = usePlanApiBase();
const notify = useNotify();

function field<K extends keyof Background>(name: K) {
  return computed<Background[K]>({
    get: () => props.designer.design.value.background[name],
    set: (value) => props.designer.edit((draft) => void (draft.background[name] = value), true),
  });
}
const kind = field("kind");
const illustrationMode = field("illustrationMode");
const color = field("color");
const gradientFrom = field("gradientFrom");
const gradientTo = field("gradientTo");
const gradientAngle = field("gradientAngle");
const pattern = field("pattern");
const patternColor = field("patternColor");
const patternScale = field("patternScale");
const overlayColor = field("overlayColor");
const overlayOpacity = field("overlayOpacity");
const blur = field("blur");

const kindItems = computed(() =>
  (["illustration", "image", "color", "gradient", "pattern"] as const).map((value) => ({ value, label: t(`designer.bgKind.${value}`) })),
);
const modeItems = computed(() => (["auto", "day", "night"] as const).map((value) => ({ value, label: t(`designer.bgMode.${value}`) })));
const patternItems = computed(() => PATTERNS.map((value) => ({ value, label: t(`designer.pattern.${value}`) })));

const file = ref<File | null>(null);
const uploading = ref(false);
async function upload() {
  if (!file.value) return;
  if (file.value.size > 10 * 1024 * 1024) return notify.error({ code: "FILE_TOO_LARGE" });
  uploading.value = true;
  const form = new FormData();
  form.append("file", file.value);
  const ok = await notify.run(() => plainFetch(`${api.value}/background`, { method: "PUT", body: form }), "settings.backgroundSaved");
  uploading.value = false;
  if (ok) {
    file.value = null;
    emit("uploaded");
  }
}
</script>

<template>
  <div class="space-y-5">
    <URadioGroup v-model="kind" :items="kindItems" variant="card" orientation="vertical" data-testid="bg-kind" />

    <UFormField v-if="kind === 'illustration'" :label="t('designer.bgModeLabel')">
      <USelect v-model="illustrationMode" :items="modeItems" size="sm" class="w-full" />
    </UFormField>

    <template v-else-if="kind === 'image'">
      <img v-if="imageUrl" :src="imageUrl" alt="" class="max-h-32 w-full rounded-md object-cover">
      <UFileUpload v-model="file" accept="image/png,image/jpeg,image/webp" :label="t('settings.chooseImage')" :description="t('settings.imageHint')" class="min-h-24 w-full" />
      <UButton :label="t('settings.upload')" icon="i-lucide-upload" size="sm" :disabled="!file" :loading="uploading" @click="upload" />
      <DesignerColorField v-model="color" :label="t('designer.fallbackColor')" />
    </template>

    <DesignerColorField v-else-if="kind === 'color'" v-model="color" :label="t('designer.bgColor')" />

    <template v-else-if="kind === 'gradient'">
      <div class="grid grid-cols-2 gap-3">
        <DesignerColorField v-model="gradientFrom" :label="t('designer.gradientFrom')" />
        <DesignerColorField v-model="gradientTo" :label="t('designer.gradientTo')" />
      </div>
      <DesignerSliderField v-model="gradientAngle" :label="t('designer.angle')" :min="0" :max="360" unit="°" />
    </template>

    <template v-else-if="kind === 'pattern'">
      <UFormField :label="t('designer.patternLabel')">
        <USelect v-model="pattern" :items="patternItems" size="sm" class="w-full" />
      </UFormField>
      <div class="grid grid-cols-2 gap-3">
        <DesignerColorField v-model="color" :label="t('designer.bgColor')" />
        <DesignerColorField v-model="patternColor" :label="t('designer.patternColor')" />
      </div>
      <DesignerSliderField v-model="patternScale" :label="t('designer.patternScale')" :min="0.5" :max="3" :step="0.1" unit="×" />
    </template>

    <USeparator />
    <DesignerColorField v-model="overlayColor" :label="t('designer.overlay')" />
    <DesignerSliderField v-model="overlayOpacity" :label="t('designer.overlayOpacity')" :min="0" :max="0.9" :step="0.05" />
    <DesignerSliderField v-model="blur" :label="t('designer.bgBlur')" :min="0" :max="20" unit="px" />
  </div>
</template>
