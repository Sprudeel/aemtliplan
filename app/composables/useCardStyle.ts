import type { CardStyle } from "~~/shared/wall-design";

const FONT_STACKS: Record<CardStyle["font"], string> = {
  "Nunito": "'Nunito', ui-sans-serif, system-ui, sans-serif",
  "Fredoka": "'Fredoka', ui-rounded, system-ui, sans-serif",
  "Patrick Hand": "'Patrick Hand', 'Comic Sans MS', cursive",
  "Roboto Slab": "'Roboto Slab', Georgia, serif",
  "Space Grotesk": "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  "System": "ui-sans-serif, system-ui, sans-serif",
};

/**
 * CSS for a wall card/widget. Sizes use the canvas unit `--u` (1 reference pixel,
 * set by WallCanvas), so the designer preview and the real screen look the same.
 */
export function cardCss(style: CardStyle, override?: { background?: string; text?: string }): Record<string, string> {
  const u = (px: number) => `calc(${px} * var(--u))`;
  const shadows = {
    none: "none",
    soft: `0 ${u(4)} ${u(18)} rgba(15, 23, 42, 0.12)`,
    strong: `0 ${u(10)} ${u(32)} rgba(15, 23, 42, 0.28)`,
  };
  const background = override?.background ?? style.background;
  return {
    backgroundColor: hexToRgba(background, override?.background ? 1 : style.opacity),
    color: override?.text ?? style.text,
    backdropFilter: style.blur ? `blur(${style.blur}px)` : "none",
    borderRadius: u(style.radius),
    boxShadow: shadows[style.shadow],
    border: style.border ? `1px solid ${hexToRgba(style.text, 0.15)}` : "none",
    fontFamily: FONT_STACKS[style.font],
    fontSize: u(16 * style.fontScale),
    textAlign: style.align,
    padding: style.preset === "polaroid" ? `${u(14)} ${u(14)} ${u(26)}` : u(16),
  };
}
