import { describe, expect, test } from "vitest";
import { errorCode, errorNames, unwrapAuth } from "~/app/utils/api-error";
import { contrastText, countdownParts, hexToRgba, isIconName, moveItem } from "~/app/utils/format";
import { patternImage } from "~/app/utils/wall-patterns";

describe("countdownParts", () => {
  const now = new Date("2026-11-02T10:00:00Z");

  test("days, hours and minutes", () => {
    expect(countdownParts(new Date("2026-11-03T12:30:59Z"), now)).toEqual({ days: 1, hours: 2, minutes: 30, due: false });
  });

  test("past or now is due", () => {
    expect(countdownParts(new Date("2026-11-02T09:00:00Z"), now).due).toBe(true);
    expect(countdownParts(now, now).due).toBe(true);
  });
});

describe("moveItem", () => {
  test("moves up and down without changing the input", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(list, 0, 1)).toEqual(["b", "a", "c"]);
    expect(list).toEqual(["a", "b", "c"]);
  });

  test("out of range returns a copy", () => {
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], -1, 0)).toEqual(["a", "b"]);
  });
});

describe("isIconName", () => {
  test("Iconify names vs emoji", () => {
    expect(isIconName("i-lucide-broom")).toBe(true);
    expect(isIconName("🧹")).toBe(false);
    expect(isIconName("i-")).toBe(false);
    expect(isIconName(null)).toBe(false);
  });
});

describe("contrastText", () => {
  test("dark backgrounds get white text, light ones black", () => {
    expect(contrastText("#0014A8")).toBe("#ffffff");
    expect(contrastText("#FFF59D")).toBe("#000000");
    expect(contrastText("not-a-color")).toBe("#ffffff");
  });
});

describe("API errors", () => {
  test("reads the code from our API errors and better-auth errors", () => {
    expect(errorCode({ data: { data: { code: "GROUP_NAME_TAKEN" } } })).toBe("GROUP_NAME_TAKEN");
    expect(errorCode({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(errorCode(new Error("boom"))).toBeNull();
    expect(errorCode(undefined)).toBeNull();
  });

  test("lists names for MEMBER_IN_OTHER_GROUP", () => {
    expect(errorNames({ data: { data: { code: "X", issues: { names: ["Gecko", "Luchs"] } } } })).toBe("Gecko, Luchs");
    expect(errorNames({})).toBe("");
  });

  test("unwrapAuth throws better-auth errors and returns data", () => {
    expect(unwrapAuth({ data: { id: "p1" }, error: null })).toEqual({ id: "p1" });
    expect(() => unwrapAuth({ data: null, error: { code: "INVALID_TOKEN" } })).toThrow();
  });
});

describe("wall helpers", () => {
  test("hexToRgba", () => {
    expect(hexToRgba("#4777b9", 0.5)).toBe("rgba(71, 119, 185, 0.5)");
  });

  test("pattern images are URL-encoded SVG data URLs in the chosen color", () => {
    for (const kind of ["dots", "stripes", "grid", "topo"] as const) {
      const css = patternImage(kind, "#86afe2");
      expect(css.startsWith('url("data:image/svg+xml,')).toBe(true);
      expect(css).not.toMatch(/[<>#]/);
      expect(decodeURIComponent(css)).toContain("#86afe2");
    }
  });
});
