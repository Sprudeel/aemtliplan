import type { PublicItemDto } from "~~/shared/types/api";
import {
  autoLayout,
  CARD_PRESET_STYLES,
  clampItem,
  nearestDefinedSize,
  resolveLayout,
  widgetKeys,
  type CardStyle,
  type LayoutItem,
  type ScreenSize,
  type WallDesign,
} from "~~/shared/wall-design";

const HISTORY_LIMIT = 60;
// The design is plain JSON; this also strips Vue's reactive proxies (structuredClone can't copy those).
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const HISTORY_COALESCE_MS = 600;

/**
 * Editing state of the wall designer: the design document, the screen size being edited,
 * the selected item, undo/redo history and "unsaved changes".
 */
export function useWallDesigner(initial: WallDesign, items: Ref<PublicItemDto[]>) {
  const design = ref<WallDesign>(clone(initial));
  const saved = ref(JSON.stringify(initial));
  const size = ref<ScreenSize>("desktop");
  const selected = ref<string | null>(null);
  const snapStep = ref(1);

  const past = ref<string[]>([]);
  const future = ref<string[]>([]);
  let lastPush = 0;

  const dirty = computed(() => JSON.stringify(design.value) !== saved.value);
  const keys = computed(() => [...items.value.map((item) => item.key), ...widgetKeys(design.value.widgets)]);
  const layout = computed(() => resolveLayout(design.value, size.value, keys.value));
  /** null = this size has its own layout; otherwise the size it inherits from (or "auto"). */
  const inheritedFrom = computed<ScreenSize | "auto" | null>(() => {
    if (design.value.layouts[size.value]) return null;
    return nearestDefinedSize(design.value, size.value) ?? "auto";
  });

  /** Records an undo step (drags within ~0.6 s become one step), then applies `change`. */
  function edit(change: (draft: WallDesign) => void, coalesce = false) {
    const now = Date.now();
    if (!coalesce || now - lastPush > HISTORY_COALESCE_MS) {
      past.value = [...past.value.slice(-HISTORY_LIMIT + 1), JSON.stringify(design.value)];
      future.value = [];
    }
    lastPush = now;
    const draft = clone(design.value);
    change(draft);
    design.value = draft;
  }

  function undo() {
    const previous = past.value.at(-1);
    if (!previous) return;
    future.value = [JSON.stringify(design.value), ...future.value];
    past.value = past.value.slice(0, -1);
    design.value = JSON.parse(previous);
  }

  function redo() {
    const next = future.value[0];
    if (!next) return;
    past.value = [...past.value, JSON.stringify(design.value)];
    future.value = future.value.slice(1);
    design.value = JSON.parse(next);
  }

  /** Changing a size that inherits its layout first copies the inherited one. */
  function updateItem(key: string, item: LayoutItem, coalesce = true) {
    edit((draft) => {
      const own = draft.layouts[size.value] ?? clone(layout.value);
      own.items[key] = clampItem(item);
      draft.layouts[size.value] = own;
    }, coalesce);
  }

  function patchSelected(change: Partial<LayoutItem>) {
    const key = selected.value;
    const current = key ? layout.value.items[key] : undefined;
    if (key && current) updateItem(key, { ...current, ...change }, false);
  }

  function autoArrange() {
    edit((draft) => {
      draft.layouts[size.value] = autoLayout(keys.value, size.value);
    });
  }

  function copyFrom(source: ScreenSize) {
    edit((draft) => {
      draft.layouts[size.value] = clone(resolveLayout(draft, source, keys.value));
    });
  }

  function resetSize() {
    edit((draft) => {
      delete draft.layouts[size.value];
    });
  }

  function applyPreset(preset: CardStyle["preset"]) {
    edit((draft) => {
      draft.card = { ...draft.card, ...CARD_PRESET_STYLES[preset], preset };
    });
  }

  function markSaved(value: WallDesign) {
    saved.value = JSON.stringify(value);
  }

  return {
    design,
    size,
    selected,
    snapStep,
    dirty,
    keys,
    layout,
    inheritedFrom,
    canUndo: computed(() => past.value.length > 0),
    canRedo: computed(() => future.value.length > 0),
    edit,
    undo,
    redo,
    updateItem,
    patchSelected,
    autoArrange,
    copyFrom,
    resetSize,
    applyPreset,
    markSaved,
  };
}

export type WallDesigner = ReturnType<typeof useWallDesigner>;
