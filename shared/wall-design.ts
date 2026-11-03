// Design of the public wall view: one document per plan, validated on the server,
// rendered by app/components/wall/WallCanvas.vue and edited in the wall designer.
// Positions are in % of the canvas, one layout per screen size.
import { z } from "zod";

// ---------------------------------------------------------------------------
// Screen sizes
// ---------------------------------------------------------------------------

export const SCREEN_SIZES = ["phone", "tablet", "desktop", "tv"] as const;
export type ScreenSize = (typeof SCREEN_SIZES)[number];

/** Reference canvas per size (used by the editor preview and for font scaling). */
export const SIZE_SPECS: Record<ScreenSize, { width: number; height: number; minViewport: number }> = {
  phone: { width: 390, height: 844, minViewport: 0 },
  tablet: { width: 1180, height: 820, minViewport: 640 },
  desktop: { width: 1440, height: 900, minViewport: 1200 },
  tv: { width: 1920, height: 1080, minViewport: 1800 },
};

/** Which layout a screen of this width uses. */
export function pickScreenSize(viewportWidth: number): ScreenSize {
  let result: ScreenSize = "phone";
  for (const size of SCREEN_SIZES) {
    if (viewportWidth >= SIZE_SPECS[size].minViewport) result = size;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const pct = z.number().min(0).max(100);

export const WIDGETS = ["title", "clock", "countdown", "qr", "text"] as const;
export type WidgetName = (typeof WIDGETS)[number];

export const FONTS = ["Nunito", "Fredoka", "Patrick Hand", "Roboto Slab", "Space Grotesk", "System"] as const;
export const CARD_PRESETS = ["glass", "paper", "bold", "night", "minimal", "polaroid"] as const;
export const PATTERNS = ["dots", "stripes", "grid", "topo"] as const;

export const LayoutItem = z.object({
  x: pct,
  y: pct,
  w: z.number().min(5).max(100),
  h: z.number().min(4).max(100),
  rotate: z.number().min(-45).max(45).default(0),
  z: z.number().int().min(0).max(999).default(1),
  hidden: z.boolean().default(false),
});
export type LayoutItem = z.output<typeof LayoutItem>;

/** Item keys: "job:<id>" for Ämtli cards, "widget:<name>" for widgets. */
const itemKey = z.string().regex(/^(job:\d+|widget:(title|clock|countdown|qr|text))$/);

export const SizeLayout = z.object({ items: z.record(itemKey, LayoutItem) });
export type SizeLayout = z.output<typeof SizeLayout>;

export const CardStyle = z.object({
  preset: z.enum(CARD_PRESETS),
  background: hex,
  text: hex,
  opacity: z.number().min(0).max(1),
  blur: z.number().min(0).max(24),
  radius: z.number().min(0).max(40),
  shadow: z.enum(["none", "soft", "strong"]),
  border: z.boolean(),
  font: z.enum(FONTS),
  fontScale: z.number().min(0.6).max(2),
  groupColor: z.enum(["chip", "stripe", "fill"]),
  align: z.enum(["left", "center"]),
  showIcon: z.boolean(),
  showDescription: z.boolean(),
  showMembers: z.boolean(),
});
export type CardStyle = z.output<typeof CardStyle>;

export const Background = z.object({
  kind: z.enum(["illustration", "image", "color", "gradient", "pattern"]),
  /** Day or night camp, or follow the viewer's light/dark mode. */
  illustrationMode: z.enum(["auto", "day", "night"]),
  color: hex,
  gradientFrom: hex,
  gradientTo: hex,
  gradientAngle: z.number().min(0).max(360),
  pattern: z.enum(PATTERNS),
  patternColor: hex,
  patternScale: z.number().min(0.5).max(3),
  overlayColor: hex,
  overlayOpacity: z.number().min(0).max(0.9),
  blur: z.number().min(0).max(20),
});
export type Background = z.output<typeof Background>;

export const Widgets = z.object({
  title: z.object({ enabled: z.boolean(), text: z.string().max(80) }),
  clock: z.object({ enabled: z.boolean(), seconds: z.boolean() }),
  countdown: z.object({ enabled: z.boolean() }),
  qr: z.object({ enabled: z.boolean() }),
  text: z.object({ enabled: z.boolean(), content: z.string().max(300) }),
});
export type Widgets = z.output<typeof Widgets>;

export const WallDesign = z.object({
  version: z.literal(1),
  card: CardStyle,
  background: Background,
  widgets: Widgets,
  layouts: z.object({
    phone: SizeLayout.optional(),
    tablet: SizeLayout.optional(),
    desktop: SizeLayout.optional(),
    tv: SizeLayout.optional(),
  }),
});
export type WallDesign = z.output<typeof WallDesign>;

// ---------------------------------------------------------------------------
// Defaults and presets
// ---------------------------------------------------------------------------

export const CARD_PRESET_STYLES: Record<(typeof CARD_PRESETS)[number], Omit<CardStyle, "preset" | "font" | "fontScale" | "align" | "showIcon" | "showDescription" | "showMembers">> = {
  glass: { background: "#ffffff", text: "#1c2430", opacity: 0.55, blur: 14, radius: 20, shadow: "soft", border: true, groupColor: "chip" },
  paper: { background: "#fdf8f1", text: "#3b2f25", opacity: 0.95, blur: 0, radius: 6, shadow: "soft", border: false, groupColor: "stripe" },
  bold: { background: "#4777b9", text: "#ffffff", opacity: 1, blur: 0, radius: 16, shadow: "strong", border: false, groupColor: "fill" },
  night: { background: "#17191d", text: "#e3eef9", opacity: 0.8, blur: 8, radius: 18, shadow: "strong", border: true, groupColor: "chip" },
  minimal: { background: "#ffffff", text: "#1c2430", opacity: 0, blur: 0, radius: 0, shadow: "none", border: false, groupColor: "chip" },
  polaroid: { background: "#ffffff", text: "#2a2a2a", opacity: 1, blur: 0, radius: 2, shadow: "strong", border: false, groupColor: "stripe" },
};

export function defaultWallDesign(): WallDesign {
  return {
    version: 1,
    card: {
      preset: "glass",
      ...CARD_PRESET_STYLES.glass,
      font: "Nunito",
      fontScale: 1,
      align: "left",
      showIcon: true,
      showDescription: true,
      showMembers: true,
    },
    background: {
      kind: "illustration",
      illustrationMode: "auto",
      color: "#e3eef9",
      gradientFrom: "#a9c8ec",
      gradientTo: "#faeedc",
      gradientAngle: 160,
      pattern: "topo",
      patternColor: "#86afe2",
      patternScale: 1,
      overlayColor: "#ffffff",
      overlayOpacity: 0,
      blur: 0,
    },
    widgets: {
      title: { enabled: true, text: "" },
      clock: { enabled: true, seconds: false },
      countdown: { enabled: true },
      qr: { enabled: false },
      text: { enabled: false, content: "" },
    },
    layouts: {},
  };
}

/** Stored design merged over the defaults (older/partial documents stay valid). */
export function withDefaults(stored: unknown): WallDesign {
  const base = defaultWallDesign();
  const value = (stored ?? {}) as Partial<WallDesign>;
  const merged = {
    ...base,
    card: { ...base.card, ...value.card },
    background: { ...base.background, ...value.background },
    widgets: {
      title: { ...base.widgets.title, ...value.widgets?.title },
      clock: { ...base.widgets.clock, ...value.widgets?.clock },
      countdown: { ...base.widgets.countdown, ...value.widgets?.countdown },
      qr: { ...base.widgets.qr, ...value.widgets?.qr },
      text: { ...base.widgets.text, ...value.widgets?.text },
    },
    layouts: value.layouts ?? {},
  };
  const parsed = WallDesign.safeParse(merged);
  return parsed.success ? parsed.data : base;
}

// ---------------------------------------------------------------------------
// Layout logic
// ---------------------------------------------------------------------------

export function widgetKeys(widgets: Widgets): string[] {
  return WIDGETS.filter((name) => widgets[name].enabled).map((name) => `widget:${name}`);
}

const WIDGET_SPOTS: Record<WidgetName, (size: ScreenSize) => LayoutItem> = {
  title: (s) => ({ x: 3, y: 3, w: s === "phone" ? 94 : 50, h: s === "phone" ? 7 : 10, rotate: 0, z: 2, hidden: false }),
  clock: (s) => ({ x: s === "phone" ? 3 : 74, y: s === "phone" ? 11 : 3, w: s === "phone" ? 45 : 23, h: s === "phone" ? 6 : 10, rotate: 0, z: 2, hidden: false }),
  countdown: (s) => ({ x: s === "phone" ? 52 : 52, y: s === "phone" ? 11 : 3, w: s === "phone" ? 45 : 20, h: s === "phone" ? 6 : 10, rotate: 0, z: 2, hidden: false }),
  qr: (s) => ({ x: s === "phone" ? 70 : 88, y: s === "phone" ? 85 : 80, w: s === "phone" ? 27 : 9, h: s === "phone" ? 12 : 16, rotate: 0, z: 2, hidden: false }),
  text: (s) => ({ x: 3, y: s === "phone" ? 87 : 88, w: s === "phone" ? 64 : 60, h: s === "phone" ? 10 : 9, rotate: 0, z: 2, hidden: false }),
};

/** Even grid for the Ämtli cards below the header row, widgets at fixed spots. */
export function autoLayout(keys: string[], size: ScreenSize): SizeLayout {
  const items: Record<string, LayoutItem> = {};
  const jobs = keys.filter((key) => key.startsWith("job:"));
  for (const key of keys) {
    if (key.startsWith("widget:")) items[key] = WIDGET_SPOTS[key.slice(7) as WidgetName](size);
  }
  if (jobs.length) {
    const spec = SIZE_SPECS[size];
    const top = size === "phone" ? 19 : 16;
    const bottom = size === "phone" ? 84 : 86;
    const margin = 3;
    const gap = 2;
    const aspect = spec.width / spec.height;
    // Columns so cards end up roughly 4:3 on screen.
    let cols = Math.max(1, Math.min(jobs.length, Math.round(Math.sqrt((jobs.length * aspect * (bottom - top)) / 100 * 1.33))));
    if (size === "phone") cols = jobs.length > 6 ? 2 : 1;
    const rows = Math.ceil(jobs.length / cols);
    const w = (100 - 2 * margin - (cols - 1) * gap) / cols;
    const h = Math.min(30, (bottom - top - (rows - 1) * gap) / rows);
    jobs.forEach((key, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      items[key] = { x: margin + col * (w + gap), y: top + row * (h + gap), w, h, rotate: 0, z: 1, hidden: false };
    });
  }
  return { items };
}

/** Nearest size that has its own layout (larger sizes first when equally near). */
export function nearestDefinedSize(design: WallDesign, size: ScreenSize): ScreenSize | null {
  const index = SCREEN_SIZES.indexOf(size);
  for (let distance = 0; distance < SCREEN_SIZES.length; distance++) {
    for (const candidate of [SCREEN_SIZES[index + distance], SCREEN_SIZES[index - distance]]) {
      if (candidate && design.layouts[candidate]) return candidate;
    }
  }
  return null;
}

/**
 * The layout to render for `size`: its own, else the nearest size's, else automatic.
 * Keys without a position (new Ämtli, newly enabled widgets) get automatic positions.
 */
export function resolveLayout(design: WallDesign, size: ScreenSize, keys: string[]): SizeLayout {
  const source = nearestDefinedSize(design, size);
  const base = source ? design.layouts[source]! : { items: {} };
  const auto = autoLayout(keys, size);
  const items: Record<string, LayoutItem> = {};
  for (const key of keys) items[key] = base.items[key] ?? auto.items[key]!;
  return { items };
}

/** Keeps an item inside the canvas. */
export function clampItem(item: LayoutItem): LayoutItem {
  const w = Math.min(100, Math.max(5, item.w));
  const h = Math.min(100, Math.max(4, item.h));
  return {
    ...item,
    w,
    h,
    x: Math.min(100 - w, Math.max(0, item.x)),
    y: Math.min(100 - h, Math.max(0, item.y)),
    rotate: Math.min(45, Math.max(-45, item.rotate)),
  };
}

/** Rounds to `step` (used for snap-to-grid while dragging). */
export function snap(value: number, step: number): number {
  return step > 0 ? Math.round(value / step) * step : value;
}
