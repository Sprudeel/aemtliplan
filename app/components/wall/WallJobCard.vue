<script setup lang="ts">
import type { PublicItemDto } from "~~/shared/types/api";
import type { CardStyle } from "~~/shared/wall-design";

// One Ämtli on the wall, styled by the design's card settings.
const props = defineProps<{ item: PublicItemDto; cardStyle: CardStyle }>();
const { t } = useI18n();

const group = computed(() => props.item.group);
const fill = computed(() => props.cardStyle.groupColor === "fill" && group.value);
const css = computed(() =>
  cardCss(
    props.cardStyle,
    fill.value ? { background: group.value!.color, text: contrastText(group.value!.color) } : undefined,
  ),
);
const stripe = computed(() =>
  props.cardStyle.groupColor === "stripe" && group.value
    ? { borderLeft: `calc(8 * var(--u)) solid ${group.value.color}` }
    : {},
);
</script>

<template>
  <article
    class="flex size-full flex-col overflow-hidden"
    :class="cardStyle.align === 'center' ? 'items-center justify-center' : ''"
    :style="{ ...css, ...stripe }"
    data-testid="wall-card"
  >
    <header class="flex items-center gap-[0.6em]" :class="cardStyle.align === 'center' ? 'flex-col' : ''">
      <span v-if="cardStyle.showIcon" class="text-[2.2em] leading-none">
        <UIcon v-if="isIconName(item.job.icon)" :name="item.job.icon!" />
        <template v-else>{{ item.job.icon || "📋" }}</template>
      </span>
      <div class="min-w-0">
        <h2 class="truncate text-[1.45em] font-bold leading-tight">{{ item.job.name }}</h2>
        <p v-if="cardStyle.showDescription && item.job.description" class="text-[0.85em] opacity-75">
          {{ item.job.description }}
        </p>
      </div>
    </header>
    <div class="mt-auto pt-[0.6em]">
      <p v-if="fill || cardStyle.groupColor === 'stripe'" class="text-[1.15em] font-semibold">
        {{ group?.name ?? t("common.nobody") }}
      </p>
      <span
        v-else-if="group"
        class="inline-block rounded-full px-[0.7em] py-[0.2em] text-[1em] font-semibold"
        :style="{ backgroundColor: group.color, color: contrastText(group.color) }"
      >{{ group.name }}</span>
      <span v-else class="opacity-60">{{ t("common.nobody") }}</span>
      <p v-if="cardStyle.showMembers && group?.members?.length" class="mt-[0.3em] text-[0.85em] opacity-80">
        {{ group.members.join(", ") }}
      </p>
    </div>
    <span class="sr-only">{{ t("wall.groupFor", { job: item.job.name }) }}</span>
  </article>
</template>
