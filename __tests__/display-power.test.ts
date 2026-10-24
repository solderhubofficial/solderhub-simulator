import { describe, expect, it } from "vitest"
import { simulateLcd1602, simulateOled13 } from "@/lib/simulator/engine/component-simulation"
import type { ComponentPin, PlacedComponent } from "@/types/simulator"

const pins: ComponentPin[] = [
  { id: "d:VCC", name: "VCC", type: "power", x: 0, y: 0 },
  { id: "d:GND", name: "GND", type: "ground", x: 0, y: 0 },
  { id: "d:SDA", name: "SDA", type: "digital", x: 0, y: 0 },
  { id: "d:SCL", name: "SCL", type: "digital", x: 0, y: 0 },
]
const component = (type: string) => ({ id: "d", type, x: 0, y: 0, rotation: 0, metadata: {} }) as unknown as PlacedComponent

describe.each([
  ["LCD 1602", simulateLcd1602, "lcd1602"],
  ["OLED 1.3\"", simulateOled13, "oled-13"],
] as const)("%s power state", (_name, simulate, type) => {
  it("is unpowered when the simulator is stopped (no pin voltages)", () => {
    expect(simulate(component(type), pins, {}).flags.powered).toBe(false)
  })
  it("is unpowered when VCC is not connected", () => {
    expect(simulate(component(type), pins, { "d:GND": 0 }).flags.powered).toBe(false)
  })
  it("is powered when VCC and GND are driven while running", () => {
    expect(simulate(component(type), pins, { "d:VCC": 5, "d:GND": 0 }).flags.powered).toBe(true)
  })
})
