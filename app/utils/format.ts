export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  due: boolean;
}

/** Time left until `target` (rounded down to minutes). */
export function countdownParts(target: Date, now: Date = new Date()): CountdownParts {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, due: true };
  const totalMinutes = Math.floor(diff / 60_000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    due: false,
  };
}

/** Moves one item and returns a new array (planner ring order). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item as T);
  return copy;
}

/** Ämtli icons are either an emoji/text or an Iconify name like "i-lucide-broom". */
export function isIconName(icon: string | null | undefined): boolean {
  return typeof icon === "string" && /^i-[a-z0-9]+-[a-z0-9-]+$/.test(icon);
}

/** Readable text color (black/white) for a #RRGGBB background. */
export function contrastText(hex: string): "#000000" | "#ffffff" {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return "#ffffff";
  const value = Number.parseInt(match[1]!, 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
}

/** #RRGGBB + opacity → rgba() */
export function hexToRgba(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return `rgba(255, 255, 255, ${alpha})`;
  const value = Number.parseInt(match[1]!, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}
