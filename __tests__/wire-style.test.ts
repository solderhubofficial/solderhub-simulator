import { describe, expect, it } from "vitest"
import { normalizeWireColor, normalizeWireRoute } from "@/lib/simulator/wire-colors"
import { initialCanvasState, simulatorReducer } from "@/lib/simulator/reducer"
import type { CanvasState, Wire } from "@/types/simulator"

describe("normalizeWireColor", () => {
  it("accepts 6- and 3-digit hex and lowercases it", () => {
    expect(normalizeWireColor("#E53935")).toBe("#e53935")
    expect(normalizeWireColor("#fa0")).toBe("#ffaa00")
    expect(normalizeWireColor("  #112233 ")).toBe("#112233")
  })

  it("rejects anything that is not a plain hex color", () => {
    for (const bad of ["red", "rgb(0,0,0)", "#12345", "#gggggg", "url(#x)", '#fff"/><script>', "", null, undefined, 42]) {
      expect(normalizeWireColor(bad)).toBeNull()
    }
  })
})

describe("normalizeWireRoute", () => {
  it("treats auto with no offset as the default", () => {
    expect(normalizeWireRoute({ style: "auto" })).toBeNull()
    expect(normalizeWireRoute({ style: "auto", offset: 0 })).toBeNull()
  })

  it("keeps a valid style and rounds the offset to half a pixel", () => {
    expect(normalizeWireRoute({ style: "hvh", offset: 12.6 })).toEqual({ style: "hvh", offset: 12.5 })
    expect(normalizeWireRoute({ style: "hvh", offset: -221.5 })).toEqual({ style: "hvh", offset: -221.5 })
    expect(normalizeWireRoute({ style: "straight" })).toEqual({ style: "straight" })
  })

  it("keeps an offset on auto, since the user dragged the bend", () => {
    expect(normalizeWireRoute({ style: "auto", offset: 20 })).toEqual({ style: "auto", offset: 20 })
  })

  it("clamps absurd offsets and rejects malformed input", () => {
    expect(normalizeWireRoute({ style: "vhv", offset: 1e9 })).toEqual({ style: "vhv", offset: 2000 })
    expect(normalizeWireRoute({ style: "vhv", offset: NaN })).toEqual({ style: "vhv" })
    expect(normalizeWireRoute({ style: "zigzag" })).toBeNull()
    expect(normalizeWireRoute("hvh")).toBeNull()
    expect(normalizeWireRoute(null)).toBeNull()
  })
})

describe("UPDATE_WIRE", () => {
  const wire: Wire = { id: "w1", fromComponentId: "a", fromPinId: "a1", toComponentId: "b", toPinId: "b1" }
  const other: Wire = { id: "w2", fromComponentId: "a", fromPinId: "a2", toComponentId: "b", toPinId: "b2" }
  const base: CanvasState = { ...initialCanvasState, wires: [wire, other] }

  it("sets a color on just that wire", () => {
    const next = simulatorReducer(base, { type: "UPDATE_WIRE", id: "w1", patch: { color: "#E53935" } })
    expect(next.wires[0].color).toBe("#e53935")
    expect(next.wires[1]).toBe(other)
  })

  it("ignores an invalid color instead of storing it", () => {
    const next = simulatorReducer(base, { type: "UPDATE_WIRE", id: "w1", patch: { color: "javascript:alert(1)" } })
    expect(next.wires[0]).not.toHaveProperty("color")
  })

  it("clears a color with null", () => {
    const colored = simulatorReducer(base, { type: "UPDATE_WIRE", id: "w1", patch: { color: "#112233" } })
    const cleared = simulatorReducer(colored, { type: "UPDATE_WIRE", id: "w1", patch: { color: null } })
    expect(cleared.wires[0]).not.toHaveProperty("color")
  })

  it("stores and clears a route, leaving the color alone", () => {
    const colored = simulatorReducer(base, { type: "UPDATE_WIRE", id: "w1", patch: { color: "#112233" } })
    const routed = simulatorReducer(colored, {
      type: "UPDATE_WIRE",
      id: "w1",
      patch: { route: { style: "hvh", offset: 40 } },
    })
    expect(routed.wires[0].route).toEqual({ style: "hvh", offset: 40 })
    expect(routed.wires[0].color).toBe("#112233")

    const reset = simulatorReducer(routed, { type: "UPDATE_WIRE", id: "w1", patch: { route: null } })
    expect(reset.wires[0]).not.toHaveProperty("route")
    expect(reset.wires[0].color).toBe("#112233")
  })

  it("does nothing for an unknown wire id", () => {
    const next = simulatorReducer(base, { type: "UPDATE_WIRE", id: "nope", patch: { color: "#112233" } })
    expect(next.wires).toEqual(base.wires)
  })

  it("keeps color and route when a wire is rewired", () => {
    const styled = simulatorReducer(base, {
      type: "UPDATE_WIRE",
      id: "w1",
      patch: { color: "#112233", route: { style: "vhv", offset: 10 } },
    })
    const rewired = simulatorReducer(styled, {
      type: "REWIRE_WIRE",
      wireId: "w1",
      endpoint: "to",
      componentId: "c",
      pinId: "c1",
    })
    expect(rewired.wires[0]).toMatchObject({ toComponentId: "c", color: "#112233", route: { style: "vhv", offset: 10 } })
  })
})
