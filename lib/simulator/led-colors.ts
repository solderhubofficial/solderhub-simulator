/**
 * Shared LED colour palette. Used by the LED renderer and by the canvas-wide
 * SVG defs (which generate one epoxy-dome gradient pair per colour), so the
 * two never drift apart.
 *
 * - tint: pale highlight colour at the lit edge of the dome
 * - body: the saturated colour of the epoxy
 * - dark: shaded rim / far side of the dome
 * - glow: the colour the die radiates when the LED is on
 */
export interface LedColor {
  tint: string
  body: string
  dark: string
  glow: string
}

export const LED_COLORS: Record<string, LedColor> = {
  red: { tint: "#ff9b8f", body: "#e5392f", dark: "#8f1a14", glow: "#ff7a6b" },
  green: { tint: "#a4f3b8", body: "#2fbf53", dark: "#147a30", glow: "#7dffa0" },
  blue: { tint: "#a3d0f7", body: "#2f7fd6", dark: "#164e91", glow: "#7cc4ff" },
  yellow: { tint: "#f9e996", body: "#ecc42a", dark: "#9a7a0c", glow: "#fff07a" },
}

export const DEFAULT_LED_COLOR = "red"

export function resolveLedColorKey(value: unknown): string {
  return typeof value === "string" && value in LED_COLORS ? value : DEFAULT_LED_COLOR
}
