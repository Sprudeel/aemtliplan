<script setup lang="ts">
import type { PublicItemDto } from "~~/shared/types/api";
import {
  clampItem,
  resolveLayout,
  SIZE_SPECS,
  snap,
  widgetKeys,
  type LayoutItem,
  type ScreenSize,
  type WallDesign,
  type WidgetName,
} from "~~/shared/wall-design";
import type { WallInfo } from "./WallWidget.vue";

/**
 * Renders a wall design for one screen size. Fills its parent; all sizes scale with the
 * canvas width. With `editable`, items can be selected, dragged, resized and rotated
 * with the mouse/touch and moved with the keyboard.
 */
const props = withDefaults(
  defineProps<{
    design: WallDesign;
    items: PublicItemDto[];
    size: ScreenSize;
    info: WallInfo;
    imageUrl?: string | null;
    editable?: boolean;
    selected?: string | null;
    snapStep?: number;
  }>(),
  { imageUrl: null, editable: false, selected: null, snapStep: 0 },
);
const emit = defineEmits<{ select: [key: string | null]; update: [key: string, item: LayoutItem] }>();
const { t } = useI18n();

const keys = computed(() => [...props.items.map((item) => item.key), ...widgetKeys(props.design.widgets)]);
const layout = computed(() => resolveLayout(props.design, props.size, keys.value));
const itemsByKey = computed(() => new Map(props.items.map((item) => [item.key, item])));
const spec = computed(() => SIZE_SPECS[props.size]);

const entries = computed(() =>
  keys.value
    .map((key) => ({ key, pos: layout.value.items[key]! }))
    .filter((entry) => props.editable || !entry.pos.hidden),
);

function boxStyle(key: string, pos: LayoutItem) {
  // While editing, the selected element is drawn on top (its saved layer stays the same).
  const raised = props.editable && props.selected === key;
  return {
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    width: `${pos.w}%`,
    height: `${pos.h}%`,
    zIndex: String(raised ? 1000 + pos.z : pos.z),
    transform: pos.rotate ? `rotate(${pos.rotate}deg)` : undefined,
  };
}

// ---------- editing ----------
const canvas = ref<HTMLElement | null>(null);
type Drag = { key: string; mode: "move" | "resize" | "rotate"; startX: number; startY: number; start: LayoutItem };
let drag: Drag | null = null;

function startDrag(event: PointerEvent, key: string, mode: Drag["mode"]) {
  if (!props.editable) return;
  event.preventDefault();
  event.stopPropagation();
  emit("select", key);
  drag = { key, mode, startX: event.clientX, startY: event.clientY, start: { ...layout.value.items[key]! } };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (!drag || !canvas.value) return;
  const rect = canvas.value.getBoundingClientRect();
  const dx = ((event.clientX - drag.startX) / rect.width) * 100;
  const dy = ((event.clientY - drag.startY) / rect.height) * 100;
  const s = drag.start;
  const step = props.snapStep;
  let next: LayoutItem;
  if (drag.mode === "move") {
    next = { ...s, x: snap(s.x + dx, step), y: snap(s.y + dy, step) };
  } else if (drag.mode === "resize") {
    next = { ...s, w: snap(s.w + dx, step), h: snap(s.h + dy, step) };
  } else {
    const cx = rect.left + ((s.x + s.w / 2) / 100) * rect.width;
    const cy = rect.top + ((s.y + s.h / 2) / 100) * rect.height;
    const angle = (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI + 90;
    const normalized = ((angle + 540) % 360) - 180;
    next = { ...s, rotate: Math.round(event.shiftKey ? normalized : snap(normalized, 5)) };
  }
  emit("update", drag.key, clampItem(next));
}

function endDrag() {
  drag = null;
}

function onKeydown(event: KeyboardEvent) {
  const key = props.selected;
  if (!props.editable || !key) return;
  const pos = layout.value.items[key];
  if (!pos) return;
  const step = event.shiftKey ? 5 : 1;
  const moves: Record<string, Partial<LayoutItem>> = event.altKey
    ? { ArrowLeft: { w: pos.w - step }, ArrowRight: { w: pos.w + step }, ArrowUp: { h: pos.h - step }, ArrowDown: { h: pos.h + step } }
    : { ArrowLeft: { x: pos.x - step }, ArrowRight: { x: pos.x + step }, ArrowUp: { y: pos.y - step }, ArrowDown: { y: pos.y + step } };
  let change: Partial<LayoutItem> | undefined = moves[event.key];
  if (event.key === "Delete" || event.key === "Backspace") change = { hidden: !pos.hidden };
  if (event.key === "]") change = { z: Math.min(999, pos.z + 1) };
  if (event.key === "[") change = { z: Math.max(0, pos.z - 1) };
  if (event.key === "Escape") {
    emit("select", null);
    return;
  }
  if (!change) return;
  event.preventDefault();
  emit("update", key, clampItem({ ...pos, ...change }));
}
</script>

<template>
  <!-- outer element is the size container, inner element defines the unit --u -->
  <div class="relative size-full overflow-hidden [container-type:size]">
    <div
      ref="canvas"
      class="absolute inset-0"
      :style="{ '--u': `calc(100cqw / ${spec.width})` }"
      :tabindex="editable ? 0 : undefined"
      :aria-label="editable ? t('designer.canvasLabel') : undefined"
      data-testid="wall-canvas"
      :data-size="size"
      @keydown="onKeydown"
      @pointerdown.self="editable && emit('select', null)"
    >
      <WallBackground :background="design.background" :image-url="imageUrl" />

      <div
        v-for="entry in entries"
        :key="entry.key"
        class="absolute"
        :class="[
          editable ? 'cursor-move touch-none select-none' : '',
          editable && entry.pos.hidden ? 'opacity-30' : '',
          editable && selected === entry.key ? 'outline-2 outline-offset-2 outline-primary' : '',
          editable && selected !== entry.key ? 'hover:outline-1 hover:outline-dashed hover:outline-primary/60' : '',
        ]"
        :style="boxStyle(entry.key, entry.pos)"
        :data-key="entry.key"
        data-testid="wall-item"
        @pointerdown="startDrag($event, entry.key, 'move')"
        @pointermove="onPointerMove"
        @pointerup="endDrag"
        @pointercancel="endDrag"
      >
        <WallJobCard
          v-if="entry.key.startsWith('job:') && itemsByKey.get(entry.key)"
          :item="itemsByKey.get(entry.key)!"
          :card-style="design.card"
        />
        <WallWidget v-else-if="entry.key.startsWith('widget:')" :name="entry.key.slice(7) as WidgetName" :design="design" :info="info" />

        <template v-if="editable && selected === entry.key">
          <span
            class="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize rounded-sm border-2 border-white bg-primary shadow"
            data-testid="resize-handle"
            @pointerdown="startDrag($event, entry.key, 'resize')"
            @pointermove="onPointerMove"
            @pointerup="endDrag"
          />
          <span
            class="absolute -top-7 left-1/2 size-4 -translate-x-1/2 cursor-grab rounded-full border-2 border-white bg-secondary shadow"
            data-testid="rotate-handle"
            :title="t('designer.rotate')"
            @pointerdown="startDrag($event, entry.key, 'rotate')"
            @pointermove="onPointerMove"
            @pointerup="endDrag"
          />
        </template>
      </div>
    </div>
  </div>
</template>
