/**
 * Shared LED colour palette. Used by the LED renderer and by the canvas-wide
 * SVG defs (which generate one epoxy-dome gradient pair per colour), so the
 * two never drift apart.
 *
 * These are common real-world single-colour through-hole LED variants. The
 * same palette drives the settings picker, lens tint, and on-state glow.
 */
export interface LedColor {
  label: string
  tint: string
  body: string
  dark: string
  glow: string
}

export const LED_COLORS: Record<string, LedColor> = {
  red:        { label: "Red",        tint: "#ff9b8f", body: "#e5392f", dark: "#8f1a14", glow: "#ff7a6b" },
  orange:     { label: "Orange",     tint: "#ffd2a0", body: "#f58a24", dark: "#9c4a0c", glow: "#ffb86b" },
  amber:      { label: "Amber",      tint: "#ffe3a1", body: "#ffb000", dark: "#9b6500", glow: "#ffd15c" },
  yellow:     { label: "Yellow",     tint: "#f9e996", body: "#ecc42a", dark: "#9a7a0c", glow: "#fff07a" },
  lime:       { label: "Lime",       tint: "#e1ffa9", body: "#9acb31", dark: "#527a10", glow: "#d2ff6b" },
  green:      { label: "Green",      tint: "#a4f3b8", body: "#2fbf53", dark: "#147a30", glow: "#7dffa0" },
  cyan:       { label: "Cyan",       tint: "#baffff", body: "#27c8d7", dark: "#087d8d", glow: "#70f6ff" },
  blue:       { label: "Blue",       tint: "#a3d0f7", body: "#2f7fd6", dark: "#164e91", glow: "#7cc4ff" },
  violet:     { label: "Violet",     tint: "#e0d7ff", body: "#7660df", dark: "#3d2c8b", glow: "#b6a7ff" },
  purple:     { label: "Purple",     tint: "#e1c5ff", body: "#9b59d0", dark: "#55237f", glow: "#d3a0ff" },
  pink:       { label: "Pink",       tint: "#ffe0ef", body: "#ed79b5", dark: "#953d6a", glow: "#ff9dd0" },
  "warm-white": { label: "Warm white", tint: "#fff8df", body: "#f1d9a0", dark: "#9d7a3c", glow: "#fff0bd" },
  white:      { label: "White",      tint: "#ffffff", body: "#edf2f8", dark: "#8995a5", glow: "#ffffff" },
}

export const LED_COLOR_OPTIONS = Object.entries(LED_COLORS).map(([value, color]) => ({
  value,
  label: color.label,
  swatch: color.body,
}))

export const DEFAULT_LED_COLOR = "red"

export function resolveLedColorKey(value: unknown): string {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(LED_COLORS, value)
    ? value
    : DEFAULT_LED_COLOR
}
