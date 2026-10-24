import { describe, expect, it } from "vitest"
import { DEFAULT_LED_COLOR, LED_COLORS, LED_COLOR_OPTIONS, resolveLedColorKey } from "@/lib/simulator/led-colors"

describe("LED colour palette", () => {
  it("provides labeled, renderable colours for the settings picker", () => {
    expect(LED_COLOR_OPTIONS.length).toBeGreaterThanOrEqual(10)

    for (const [key, color] of Object.entries(LED_COLORS)) {
      expect(color.label).toBeTruthy()
      expect(color.tint).toMatch(/^#[\da-f]{6}$/i)
      expect(color.body).toMatch(/^#[\da-f]{6}$/i)
      expect(color.dark).toMatch(/^#[\da-f]{6}$/i)
      expect(color.glow).toMatch(/^#[\da-f]{6}$/i)
      expect(LED_COLOR_OPTIONS.some((option) => option.value === key && option.label === color.label)).toBe(true)
    }
  })

  it("resolves every supported colour and safely falls back for invalid metadata", () => {
    for (const key of Object.keys(LED_COLORS)) {
      expect(resolveLedColorKey(key)).toBe(key)
    }

    expect(resolveLedColorKey(undefined)).toBe(DEFAULT_LED_COLOR)
    expect(resolveLedColorKey("not-a-real-led-colour")).toBe(DEFAULT_LED_COLOR)
    expect(resolveLedColorKey("toString")).toBe(DEFAULT_LED_COLOR)
  })
})
