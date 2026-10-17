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

const ROUTE_STYLES: readonly WireRouteStyle[] = ["auto", "hvh", "vhv", "straight", "custom"]
const MAX_OFFSET = 2000
const MAX_BEND_POINTS = 40
const MAX_COORDINATE = 100_000

/** Returns a safe route, or null if `value` is missing, malformed, or the default. */
export function normalizeWireRoute(value: unknown): WireRoute | null {
  if (typeof value !== "object" || value === null) return null
  const { style, offset, points } = value as { style?: unknown; offset?: unknown; points?: unknown }
  if (!ROUTE_STYLES.includes(style as WireRouteStyle)) return null
  if (style === "custom") {
    // Bend points come from user input and imported files: keep only finite, sane coordinates.
    if (!Array.isArray(points)) return null
    const safe: { x: number; y: number }[] = []
    for (const point of points.slice(0, MAX_BEND_POINTS)) {
      const { x, y } = (point ?? {}) as { x?: unknown; y?: unknown }
      if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) continue
      if (Math.abs(x) > MAX_COORDINATE || Math.abs(y) > MAX_COORDINATE) continue
      safe.push({ x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 })
    }
    return safe.length > 0 ? { style: "custom", points: safe } : null
  }
  const safeOffset =
    typeof offset === "number" && Number.isFinite(offset)
      ? Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, Math.round(offset)))
      : 0
  if (style === "auto" && safeOffset === 0) return null
  return safeOffset === 0 ? { style: style as WireRouteStyle } : { style: style as WireRouteStyle, offset: safeOffset }
}

const SIGNAL_COLORS = ["#1e88e5", "#43a047", "#fb8c00", "#8e24aa", "#00acc1", "#d81b60"]

function hashText(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Colour a wire gets when nobody has picked one: red for power, black for
 * ground, the usual green/blue for clock and data lines, yellow for analog,
 * and a stable palette colour per wire for everything else.
 */
export function autoWireColor(
  fromPin: { name: string; type: string },
  toPin: { name: string; type: string },
  wireId: string
): string {
  const pins = [fromPin, toPin]
  if (pins.some((p) => p.type === "ground")) return "#212121"
  if (pins.some((p) => p.type === "power")) return "#e53935"
  const names = pins.map((p) => p.name.toUpperCase())
  if (names.some((n) => n.startsWith("SCL") || n.startsWith("SCK"))) return "#43a047"
  if (names.some((n) => n.startsWith("SDA") || n === "MOSI")) return "#1e88e5"
  if (names.some((n) => n === "MISO")) return "#fb8c00"
  if (pins.some((p) => p.type === "analog")) return "#fdd835"
  return SIGNAL_COLORS[hashText(wireId) % SIGNAL_COLORS.length]
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

/** Mix a "#rrggbb" colour toward black (amount < 0) or white (amount > 0). */
export function shadeColor(hex: string, amount: number): string {
  const target = amount < 0 ? 0 : 255
  const t = Math.abs(amount)
  return (
    "#" +
    channels(hex)
      .map((c) => Math.round(c + (target - c) * t).toString(16).padStart(2, "0"))
      .join("")
  )
}

/** Insulation edge and shine colours for a wire of the given "#rrggbb" colour. */
export function wireShades(hex: string): { casing: string; shine: string } {
  const [r, g, b] = channels(hex)
  const dark = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.2
  return {
    // Near-black wires get a light edge so they stay visible on a dark canvas.
    casing: dark ? "#6b7684" : shadeColor(hex, -0.4),
    shine: dark ? "#ffffff" : shadeColor(hex, 0.65),
  }
}
