import { describe, expect, test } from "vitest";
import { isValidTimeZone, SettingsPatch } from "~/shared/schemas";
import { detectImageType } from "~/server/utils/images";
import { nextRunAt } from "~/server/utils/schedule";

describe("nextRunAt", () => {
  test("later the same day", () => {
    // 10:00 Zurich (UTC+1 in November)
    expect(nextRunAt("17:00", "Europe/Zurich", new Date("2026-11-02T09:00:00Z")).toISOString()).toBe(
      "2026-11-02T16:00:00.000Z",
    );
  });

  test("next day when today's time has passed", () => {
    expect(nextRunAt("07:30", "Europe/Zurich", new Date("2026-11-02T09:00:00Z")).toISOString()).toBe(
      "2026-11-03T06:30:00.000Z",
    );
  });

  test("handles the switch to summer time", () => {
    // 2026-03-29: Zurich switches from UTC+1 to UTC+2
    expect(nextRunAt("17:00", "Europe/Zurich", new Date("2026-03-28T18:00:00Z")).toISOString()).toBe(
      "2026-03-29T15:00:00.000Z",
    );
  });

  test("exactly at the run time returns the next day", () => {
    expect(nextRunAt("17:00", "Europe/Zurich", new Date("2026-11-02T16:00:00Z")).toISOString()).toBe(
      "2026-11-03T16:00:00.000Z",
    );
  });
});

describe("settings schema", () => {
  test("accepts valid time zone and HH:mm", () => {
    expect(SettingsPatch.safeParse({ timezone: "Europe/Zurich", rotationTime: "07:05" }).success).toBe(true);
  });

  test("rejects bad values and empty patches", () => {
    expect(isValidTimeZone("Mars/Base")).toBe(false);
    expect(SettingsPatch.safeParse({ rotationTime: "7:5" }).success).toBe(false);
    expect(SettingsPatch.safeParse({}).success).toBe(false);
  });
});

describe("detectImageType", () => {
  test("by magic bytes", () => {
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.ext).toBe("png");
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(detectImageType(new TextEncoder().encode("RIFF1234WEBPVP8 "))?.ext).toBe("webp");
  });

  test("rejects other content even with an image name", () => {
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});
