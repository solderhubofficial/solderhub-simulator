import type { WireRoute, WireRouteStyle } from "@/types/simulator"

/** Classic jumper-wire colors, in the order they appear in the picker. */
export const WIRE_COLOR_PRESETS: readonly { name: string; hex: string }[] = [
  { name: "Red", hex: "#e53935" },
  { name: "Black", hex: "#212121" },
  { name: "Yellow", hex: "#fdd835" },
  { name: "Green", hex: "#43a047" },
  { name: "Blue", hex: "#1e88e5" },
  { name: "Orange", hex: "#fb8c00" },
  { name: "White", hex: "#f5f5f5" },
  { name: "Brown", hex: "#6d4c41" },
  { name: "Purple", hex: "#8e24aa" },
  { name: "Grey", hex: "#9e9e9e" },
]

const HEX6 = /^#[0-9a-f]{6}$/i
const HEX3 = /^#[0-9a-f]{3}$/i

/**
 * Returns a lowercase "#rrggbb" string, or null if `value` is not a hex color.
 * Wire colors come from user input and imported files, and end up inside SVG
 * attributes, so anything that is not a plain hex color is rejected.
 */
export function normalizeWireColor(value: unknown): string | null {
  if (typeof value !== "string") return null
  const v = value.trim()
  if (HEX6.test(v)) return v.toLowerCase()
  if (HEX3.test(v)) {
    const [, r, g, b] = v.toLowerCase()
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return null
}

const ROUTE_STYLES: readonly WireRouteStyle[] = ["auto", "hvh", "vhv", "straight"]
const MAX_OFFSET = 2000

/** Returns a safe route, or null if `value` is missing, malformed, or the default. */
export function normalizeWireRoute(value: unknown): WireRoute | null {
  if (typeof value !== "object" || value === null) return null
  const { style, offset } = value as { style?: unknown; offset?: unknown }
  if (!ROUTE_STYLES.includes(style as WireRouteStyle)) return null
  const safeOffset =
    typeof offset === "number" && Number.isFinite(offset)
      ? // Half-pixel steps: a bend snapped to the 10px grid can sit half a pixel
        // from the wire's midpoint, and whole-pixel rounding would knock it off.
        Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, Math.round(offset * 2) / 2))
      : 0
  if (style === "auto" && safeOffset === 0) return null
  return safeOffset === 0 ? { style: style as WireRouteStyle } : { style: style as WireRouteStyle, offset: safeOffset }
}
