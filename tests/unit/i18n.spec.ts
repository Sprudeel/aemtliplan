import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = path.resolve(__dirname, "../..");
type Messages = { [key: string]: string | Messages };

function load(locale: string): Messages {
  return JSON.parse(readFileSync(path.join(root, "i18n/locales", `${locale}.json`), "utf8"));
}

function flatten(messages: Messages, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(messages)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") result.set(full, value);
    else for (const [k, v] of flatten(value, full)) result.set(k, v);
  }
  return result;
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.(vue|ts)$/.test(name) ? [full] : [];
  });
}

const de = flatten(load("de"));
const others = { fr: flatten(load("fr")), it: flatten(load("it")) };
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  for (const [locale, messages] of Object.entries(others)) {
    test(`${locale} has exactly the German keys`, () => {
      expect([...messages.keys()].sort()).toEqual([...de.keys()].sort());
    });

    test(`${locale} uses the same placeholders and plural forms`, () => {
      for (const [key, text] of de) {
        const other = messages.get(key) ?? "";
        expect(placeholders(other), key).toEqual(placeholders(text));
        expect(other.split("|").length, key).toBe(text.split("|").length);
      }
    });
  }

  test("every key used in the app exists", () => {
    const used = new Set<string>();
    for (const file of files(path.join(root, "app"))) {
      const source = readFileSync(file, "utf8");
      // t("x.y"), te("x.y"), and keys passed to notify.success/run ("x.y")
      for (const match of source.matchAll(/\bte?\(\s*["'`]([a-z][\w]*(?:\.[\w]+)+)["'`]/g)) used.add(match[1]!);
      for (const match of source.matchAll(/[(,]\s*["']((?:auth|groups|jobs|plans|rotation|settings|access|account|invitation|planner|errors)\.[\w.]+)["']/g)) {
        used.add(match[1]!);
      }
    }
    // Keys built at runtime
    for (const trigger of ["manual", "schedule", "undo"]) used.add(`rotation.trigger.${trigger}`);
    for (const stat of ["jobs", "open", "groups", "idle"]) used.add(`dashboard.stats.${stat}`);

    const missing = [...used].filter((key) => !de.has(key));
    expect(missing).toEqual([]);
  });

  test("every API error code has a message", () => {
    const codes = new Set<string>();
    for (const file of files(path.join(root, "server"))) {
      for (const match of readFileSync(file, "utf8").matchAll(/apiError\(\s*\d+,\s*"([A-Z_]+)"/g)) codes.add(match[1]!);
    }
    expect(codes.size).toBeGreaterThan(10);
    expect([...codes].filter((code) => !de.has(`errors.${code}`))).toEqual([]);
  });
});
