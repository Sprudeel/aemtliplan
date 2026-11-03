import type { Background } from "~~/shared/wall-design";

/** CSS background-image (SVG data URL) for a wall background pattern. */
export function patternImage(kind: Background["pattern"], color: string): string {
  const c = color;
  const svgs: Record<Background["pattern"], string> = {
    dots: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='3' cy='3' r='2' fill='${c}'/></svg>`,
    stripes: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M-6 30 L30 -6' stroke='${c}' stroke-width='6'/><path d='M-18 18 L18 -18 M6 42 L42 6' stroke='${c}' stroke-width='6'/></svg>`,
    grid: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><path d='M32 0 H0 V32' fill='none' stroke='${c}' stroke-width='1.5'/></svg>`,
    topo: `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' fill='none' stroke='${c}' stroke-width='2'><path d='M20 120 C60 40 180 40 220 120 S60 200 20 120 Z'/><path d='M50 120 C80 70 160 70 190 120 S80 170 50 120 Z'/><path d='M85 120 C100 95 140 95 155 120 S100 145 85 120 Z'/><path d='M0 30 C60 0 120 60 240 20'/><path d='M0 220 C80 180 160 250 240 210'/></svg>`,
  };
  return `url("data:image/svg+xml,${encodeURIComponent(svgs[kind])}")`;
}
