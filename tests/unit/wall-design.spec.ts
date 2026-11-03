import { describe, expect, test } from "vitest";
import {
  autoLayout,
  clampItem,
  defaultWallDesign,
  nearestDefinedSize,
  pickScreenSize,
  resolveLayout,
  snap,
  WallDesign,
  withDefaults,
  type LayoutItem,
} from "~/shared/wall-design";

const item = (x: number, y: number, w = 20, h = 20): LayoutItem => ({ x, y, w, h, rotate: 0, z: 1, hidden: false });
const overlaps = (a: LayoutItem, b: LayoutItem) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("pickScreenSize", () => {
  test("maps viewport widths to sizes", () => {
    expect(pickScreenSize(375)).toBe("phone");
    expect(pickScreenSize(800)).toBe("tablet");
    expect(pickScreenSize(1440)).toBe("desktop");
    expect(pickScreenSize(1920)).toBe("tv");
    expect(pickScreenSize(3840)).toBe("tv");
  });
});

describe("autoLayout", () => {
  for (const size of ["phone", "tablet", "desktop", "tv"] as const) {
    test(`${size}: cards and widgets stay inside the canvas and do not overlap`, () => {
      const keys = [...Array.from({ length: 9 }, (_, i) => `job:${i + 1}`), "widget:title", "widget:clock", "widget:countdown"];
      const { items } = autoLayout(keys, size);
      const all = Object.values(items);
      expect(all).toHaveLength(keys.length);
      for (const pos of all) {
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.x + pos.w).toBeLessThanOrEqual(100.001);
        expect(pos.y + pos.h).toBeLessThanOrEqual(100.001);
      }
      const cards = keys.filter((key) => key.startsWith("job:")).map((key) => items[key]!);
      for (const [i, a] of cards.entries()) for (const b of cards.slice(i + 1)) expect(overlaps(a, b)).toBe(false);
    });
  }
});

describe("resolveLayout", () => {
  test("a size without its own layout uses the nearest size that has one", () => {
    const design = defaultWallDesign();
    design.layouts.desktop = { items: { "job:1": item(10, 20) } };
    expect(nearestDefinedSize(design, "tv")).toBe("desktop");
    expect(nearestDefinedSize(design, "phone")).toBe("desktop");
    expect(resolveLayout(design, "tv", ["job:1"]).items["job:1"]).toEqual(item(10, 20));
  });

  test("prefers the larger neighbour when two are equally near", () => {
    const design = defaultWallDesign();
    design.layouts.phone = { items: { "job:1": item(1, 1) } };
    design.layouts.desktop = { items: { "job:1": item(50, 50) } };
    expect(nearestDefinedSize(design, "tablet")).toBe("desktop");
  });

  test("new Ämtli without a saved position get an automatic one", () => {
    const design = defaultWallDesign();
    design.layouts.desktop = { items: { "job:1": item(10, 20) } };
    const layout = resolveLayout(design, "desktop", ["job:1", "job:2"]);
    expect(layout.items["job:1"]).toEqual(item(10, 20));
    expect(layout.items["job:2"]).toBeDefined();
  });

  test("positions of deleted Ämtli are ignored", () => {
    const design = defaultWallDesign();
    design.layouts.desktop = { items: { "job:1": item(10, 20), "job:99": item(0, 0) } };
    expect(Object.keys(resolveLayout(design, "desktop", ["job:1"]).items)).toEqual(["job:1"]);
  });

  test("no layouts at all: automatic", () => {
    const keys = ["job:1", "job:2"];
    expect(resolveLayout(defaultWallDesign(), "phone", keys)).toEqual(autoLayout(keys, "phone"));
  });
});

describe("helpers", () => {
  test("clampItem keeps items inside the canvas", () => {
    expect(clampItem({ ...item(95, -5, 20, 10), rotate: 90 })).toEqual({ ...item(80, 0, 20, 10), rotate: 45 });
    expect(clampItem(item(10, 10, 1, 1)).w).toBe(5);
  });

  test("snap rounds to the grid step; 0 = free", () => {
    expect(snap(12.4, 2.5)).toBe(12.5);
    expect(snap(12.4, 0)).toBe(12.4);
  });
});

describe("schema", () => {
  test("default design is valid", () => {
    expect(WallDesign.safeParse(defaultWallDesign()).success).toBe(true);
  });

  test("rejects positions outside 0–100 and unknown keys", () => {
    const design = defaultWallDesign();
    design.layouts.phone = { items: { "job:1": { ...item(10, 10), x: 140 } } };
    expect(WallDesign.safeParse(design).success).toBe(false);
    const bad = defaultWallDesign() as unknown as { layouts: Record<string, unknown> };
    bad.layouts.phone = { items: { "script:alert": item(1, 1) } };
    expect(WallDesign.safeParse(bad).success).toBe(false);
  });

  test("withDefaults fills missing parts and falls back on garbage", () => {
    const partial = withDefaults({ card: { radius: 4 }, widgets: { qr: { enabled: true } } });
    expect(partial.card.radius).toBe(4);
    expect(partial.card.font).toBe("Nunito");
    expect(partial.widgets.qr.enabled).toBe(true);
    expect(partial.widgets.title.enabled).toBe(true);
    expect(withDefaults({ card: { radius: "round" } })).toEqual(defaultWallDesign());
    expect(withDefaults(null)).toEqual(defaultWallDesign());
  });
});
