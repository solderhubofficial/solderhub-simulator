import { describe, expect, it } from "vitest"
import { computeFitViewport } from "@/lib/simulator/utils/fit-view"
import { hasBoard } from "@/lib/simulator/board-label"

const opts = { minZoom: 0.2, maxZoom: 3, padding: 20 }

describe("computeFitViewport", () => {
  it("returns null for an empty circuit", () => {
    expect(computeFitViewport([], { width: 800, height: 600 }, opts)).toBeNull()
  })

  it("zooms out so a large circuit fits and centres it", () => {
    const v = computeFitViewport([{ x: 0, y: 0, width: 2000, height: 1000 }], { width: 1000, height: 600 }, opts)!
    expect(v.zoom).toBeCloseTo(0.48, 2)
    expect(v.x + 1000 * v.zoom).toBeCloseTo(500, 1) // centre of circuit lands at centre of screen
    expect(v.y + 500 * v.zoom).toBeCloseTo(300, 1)
  })

  it("does not blow a tiny circuit up past maxFitZoom", () => {
    const v = computeFitViewport([{ x: 0, y: 0, width: 50, height: 50 }], { width: 1000, height: 800 }, opts)!
    expect(v.zoom).toBe(1.2)
  })

  it("accounts for rotation", () => {
    const flat = computeFitViewport([{ x: 0, y: 0, width: 400, height: 100 }], { width: 500, height: 500 }, opts)!
    const turned = computeFitViewport([{ x: 0, y: 0, width: 400, height: 100, rotation: 90 }], { width: 500, height: 500 }, opts)!
    expect(turned.zoom).toBeCloseTo(flat.zoom, 5) // same footprint, just rotated, fits equally in a square
  })

  it("clamps to min zoom", () => {
    const v = computeFitViewport([{ x: 0, y: 0, width: 100000, height: 100000 }], { width: 500, height: 500 }, opts)!
    expect(v.zoom).toBe(0.2)
  })
})

describe("hasBoard", () => {
  it("detects boards but not plain parts", () => {
    expect(hasBoard([{ type: "led" }, { type: "resistor" }])).toBe(false)
    expect(hasBoard([{ type: "led" }, { type: "arduino-uno" }])).toBe(true)
    expect(hasBoard([{ type: "esp32-c3" }])).toBe(true)
  })
})
