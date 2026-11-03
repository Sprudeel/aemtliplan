import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";
import WallCanvas from "~/components/wall/WallCanvas.vue";
import WallBackground from "~/components/wall/WallBackground.vue";
import type { PublicItemDto } from "~~/shared/types/api";
import { defaultWallDesign, type WallDesign } from "~~/shared/wall-design";

const items: PublicItemDto[] = [
  { key: "job:1", job: { name: "Küche", icon: "🍽️", description: "Spülen" }, group: { name: "Wölfe", color: "#A81B00", members: ["Gecko"] } },
  { key: "job:2", job: { name: "Holz", icon: null, description: null }, group: null },
];
const info = { title: "Sommerlager", nextRotationAt: null, publicUrl: "http://localhost/p/abc" };

function designWith(change: (design: WallDesign) => void) {
  const design = defaultWallDesign();
  design.widgets.clock.enabled = false;
  design.widgets.countdown.enabled = false;
  change(design);
  return design;
}

describe("WallCanvas", () => {
  test("places items at their saved position for the size", async () => {
    const design = designWith((d) => {
      d.layouts.desktop = { items: { "job:1": { x: 12, y: 34, w: 25, h: 20, rotate: -4, z: 7, hidden: false } } };
    });
    const wrapper = await mountSuspended(WallCanvas, { props: { design, items, size: "desktop", info } });
    const kitchen = wrapper.find('[data-key="job:1"]');
    const style = kitchen.attributes("style")!;
    expect(style).toContain("left: 12%");
    expect(style).toContain("top: 34%");
    expect(style).toContain("width: 25%");
    expect(style).toContain("rotate(-4deg)");
    expect(style).toContain("z-index: 7");
    expect(kitchen.text()).toContain("Küche");
    expect(kitchen.text()).toContain("Wölfe");
    // job:2 has no saved position: still shown (automatic position)
    expect(wrapper.find('[data-key="job:2"]').exists()).toBe(true);
    expect(wrapper.find('[data-key="widget:title"]').text()).toContain("Sommerlager");
  });

  test("hidden items are left out on the wall, but shown faded in the editor", async () => {
    const design = designWith((d) => {
      d.layouts.phone = { items: { "job:1": { x: 0, y: 0, w: 50, h: 20, rotate: 0, z: 1, hidden: true } } };
    });
    const wall = await mountSuspended(WallCanvas, { props: { design, items, size: "phone", info } });
    expect(wall.find('[data-key="job:1"]').exists()).toBe(false);
    const editor = await mountSuspended(WallCanvas, { props: { design, items, size: "phone", info, editable: true } });
    expect(editor.find('[data-key="job:1"]').classes()).toContain("opacity-30");
  });

  test("editor: arrow keys move the selected item, shift moves 5 %", async () => {
    const design = designWith((d) => {
      d.layouts.desktop = { items: { "job:1": { x: 10, y: 10, w: 20, h: 20, rotate: 0, z: 1, hidden: false } } };
    });
    const wrapper = await mountSuspended(WallCanvas, {
      props: { design, items, size: "desktop", info, editable: true, selected: "job:1" },
    });
    const canvas = wrapper.find('[data-testid="wall-canvas"]');
    await canvas.trigger("keydown", { key: "ArrowRight" });
    await canvas.trigger("keydown", { key: "ArrowDown", shiftKey: true });
    await canvas.trigger("keydown", { key: "Delete" });
    const updates = wrapper.emitted("update")!;
    expect(updates[0]).toEqual(["job:1", expect.objectContaining({ x: 11, y: 10 })]);
    expect(updates[1]).toEqual(["job:1", expect.objectContaining({ x: 10, y: 15 })]);
    expect(updates[2]).toEqual(["job:1", expect.objectContaining({ hidden: true })]);
  });

  test("selected item shows resize and rotate handles", async () => {
    const wrapper = await mountSuspended(WallCanvas, {
      props: { design: designWith(() => {}), items, size: "tablet", info, editable: true, selected: "job:2" },
    });
    expect(wrapper.find('[data-key="job:2"] [data-testid="resize-handle"]').exists()).toBe(true);
    expect(wrapper.find('[data-key="job:2"] [data-testid="rotate-handle"]').exists()).toBe(true);
    expect(wrapper.find('[data-key="job:1"] [data-testid="resize-handle"]').exists()).toBe(false);
  });
});

describe("WallBackground", () => {
  test("gradient and pattern backgrounds", async () => {
    const design = defaultWallDesign();
    design.background.kind = "gradient";
    const gradient = await mountSuspended(WallBackground, { props: { background: design.background } });
    expect(gradient.html()).toContain("linear-gradient(160deg");

    design.background.kind = "pattern";
    design.background.overlayOpacity = 0.5;
    const pattern = await mountSuspended(WallBackground, { props: { background: design.background } });
    expect(pattern.find('[data-testid="wall-background"]').attributes("data-kind")).toBe("pattern");
    expect(pattern.html()).toContain("rgba(255, 255, 255, 0.5)"); // overlay
  });

  test("camp illustration by default", async () => {
    const wrapper = await mountSuspended(WallBackground, { props: { background: defaultWallDesign().background } });
    expect(wrapper.html()).toMatch(/\/backgrounds\/camp-(day|night)\.svg/);
  });
});

describe("useWallDesigner", () => {
  test("editing an inherited size copies the layout, undo/redo restore it", async () => {
    const design = defaultWallDesign();
    design.layouts.desktop = { items: { "job:1": { x: 10, y: 10, w: 20, h: 20, rotate: 0, z: 1, hidden: false } } };
    const designer = useWallDesigner(design, ref(items));
    designer.size.value = "tv";
    expect(designer.inheritedFrom.value).toBe("desktop");

    designer.updateItem("job:1", { x: 50, y: 10, w: 20, h: 20, rotate: 0, z: 1, hidden: false }, false);
    expect(designer.inheritedFrom.value).toBeNull();
    expect(designer.design.value.layouts.tv!.items["job:1"]!.x).toBe(50);
    expect(designer.design.value.layouts.desktop!.items["job:1"]!.x).toBe(10);
    expect(designer.dirty.value).toBe(true);

    designer.undo();
    expect(designer.design.value.layouts.tv).toBeUndefined();
    expect(designer.dirty.value).toBe(false);
    designer.redo();
    expect(designer.design.value.layouts.tv!.items["job:1"]!.x).toBe(50);
  });

  test("presets change the card look in one step", () => {
    const designer = useWallDesigner(defaultWallDesign(), ref(items));
    designer.applyPreset("night");
    expect(designer.design.value.card).toMatchObject({ preset: "night", background: "#17191d" });
    designer.undo();
    expect(designer.design.value.card.preset).toBe("glass");
  });
});
