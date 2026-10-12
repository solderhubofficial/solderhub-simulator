import { describe, expect, it } from "vitest"
import { laneOffsets, roundedPointsToPath } from "@/lib/simulator/utils/wire-routing"
import { autoWireColor, normalizeWireColor, shadeColor, wireShades } from "@/lib/simulator/wire-colors"

describe("roundedPointsToPath", () => {
  it("rounds each bend and ends on the last point", () => {
    const d = roundedPointsToPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }])
    expect(d.startsWith("M 0 0")).toBe(true)
    expect(d).toContain("Q 100 0")
    expect(d.endsWith("L 100 80")).toBe(true)
  })
  it("never rounds more than half of a short leg", () => {
    const d = roundedPointsToPath([{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 100 }])
    expect(d).toContain("L 3 0")
  })
  it("leaves straight two-point wires alone", () => {
    expect(roundedPointsToPath([{ x: 0, y: 0 }, { x: 50, y: 0 }])).toBe("M 0 0 L 50 0")
  })
})

describe("laneOffsets", () => {
  it("fans out wires between the same two parts, in either direction", () => {
    const lanes = laneOffsets([
      { id: "a", fromComponentId: "x", toComponentId: "y" },
      { id: "b", fromComponentId: "y", toComponentId: "x" },
      { id: "c", fromComponentId: "x", toComponentId: "y" },
      { id: "d", fromComponentId: "x", toComponentId: "z" },
    ])
    expect(new Set([lanes.get("a"), lanes.get("b"), lanes.get("c")]).size).toBe(3)
    expect(lanes.get("b")).toBe(0)
    expect(lanes.get("d")).toBe(0)
  })
})

describe("default wire colours", () => {
  const pin = (name: string, type: string) => ({ name, type })
  it("follows convention", () => {
    expect(autoWireColor(pin("VCC", "power"), pin("5V", "power"), "w")).toBe("#e53935")
    expect(autoWireColor(pin("GND", "ground"), pin("IO4", "digital"), "w")).toBe("#212121")
    expect(autoWireColor(pin("SCL", "digital"), pin("IO22", "digital"), "w")).toBe("#43a047")
    expect(autoWireColor(pin("SDA", "digital"), pin("IO21", "digital"), "w")).toBe("#1e88e5")
    expect(autoWireColor(pin("AO", "analog"), pin("IO34", "analog"), "w")).toBe("#fdd835")
  })
  it("is stable for the same wire", () => {
    const a = autoWireColor(pin("DO", "digital"), pin("IO32", "digital"), "wire_9")
    expect(autoWireColor(pin("DO", "digital"), pin("IO32", "digital"), "wire_9")).toBe(a)
    expect(normalizeWireColor(a)).toBe(a)
  })
  it("gives near-black wires a light edge and others a darker one", () => {
    expect(wireShades("#212121").casing).toBe("#6b7684")
    expect(wireShades("#1e88e5").casing).not.toBe("#1e88e5")
    expect(shadeColor("#808080", 1)).toBe("#ffffff")
    expect(shadeColor("#808080", -1)).toBe("#000000")
  })
})
