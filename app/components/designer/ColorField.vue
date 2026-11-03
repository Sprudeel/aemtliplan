<script setup lang="ts">
// Color swatch with a picker popover and a hex input.
defineProps<{ label: string }>();
const model = defineModel<string>({ required: true });
const hex = ref(model.value);
watch(model, (value) => (hex.value = value));
function commitHex() {
  if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) model.value = hex.value.toLowerCase();
  else hex.value = model.value;
}
</script>

<template>
  <UFormField :label="label">
    <div class="flex items-center gap-2">
      <UPopover>
        <button
          type="button"
          class="size-8 shrink-0 rounded-md ring ring-default"
          :style="{ backgroundColor: model }"
          :aria-label="label"
        />
        <template #content>
          <UColorPicker v-model="model" class="p-2" />
        </template>
      </UPopover>
      <UInput v-model="hex" size="sm" class="w-28 font-mono" @blur="commitHex" @keydown.enter="commitHex" />
    </div>
  </UFormField>
</template>
