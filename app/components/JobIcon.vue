<script setup lang="ts">
// Ämtli icon: an Iconify name ("i-lucide-broom") or an emoji / short text.
const props = withDefaults(defineProps<{ icon: string | null | undefined; size?: "sm" | "md" | "lg" }>(), {
  size: "md",
});
const sizeClass = computed(() => ({ sm: "size-5 text-base", md: "size-7 text-xl", lg: "size-12 text-4xl" })[props.size]);
</script>

<template>
  <span class="inline-flex items-center justify-center shrink-0" :class="sizeClass" aria-hidden="true">
    <UIcon v-if="isIconName(icon)" :name="icon!" class="size-full" />
    <span v-else-if="icon">{{ icon }}</span>
    <UIcon v-else name="i-lucide-clipboard-list" class="size-full text-muted" />
  </span>
</template>
