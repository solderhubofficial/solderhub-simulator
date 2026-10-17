import { describe, expect, it } from "vitest"
import { normalizeWireRoute } from "@/lib/simulator/wire-colors"
import { routeWire } from "@/lib/simulator/utils/wire-routing"
import { closeOrthogonal, insertBend, removeBend, shiftWireBends } from "@/lib/simulator/utils/wire-waypoints"
import { segmentAngle, snapWirePoint } from "@/lib/simulator/utils/wire-snap"
import { initialCanvasState, simulatorReducer } from "@/lib/simulator/reducer"
import type { Wire } from "@/types/simulator"

const wire = (points: { x: number; y: number }[]): Wire => ({
  id: "w1", fromComponentId: "a", fromPinId: "p", toComponentId: "b", toPinId: "q",
  route: { style: "custom", points },
})

describe("normalizeWireRoute (custom)", () => {
  it("keeps valid bends and rounds them to half pixels", () => {
    expect(normalizeWireRoute({ style: "custom", points: [{ x: 10.26, y: 20 }] })).toEqual({ style: "custom", points: [{ x: 10.5, y: 20 }] })
  })
  it("drops malformed points and falls back to auto when none are left", () => {
    expect(normalizeWireRoute({ style: "custom", points: [{ x: "1", y: 2 }, null, { x: NaN, y: 1 }] })).toBeNull()
    expect(normalizeWireRoute({ style: "custom" })).toBeNull()
  })
})

describe("routeWire (custom)", () => {
  it("follows the bends exactly between the pins", () => {
    const routed = routeWire({ x: 0, y: 0, dir: null }, { x: 100, y: 0, dir: null }, [], { style: "custom", points: [{ x: 0, y: 50 }, { x: 100, y: 50 }] })
    expect(routed.points).toEqual([{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 100, y: 50 }, { x: 100, y: 0 }])
  })
  it("leaves a pin through its lead-out before heading to the first bend", () => {
    const routed = routeWire({ x: 0, y: 0, dir: { x: 0, y: -1 } }, { x: 100, y: 0, dir: null }, [], { style: "custom", points: [{ x: 40, y: -40 }] })
    expect(routed.points[1]).toEqual({ x: 0, y: -14 })
  })
})

describe("snapWirePoint", () => {
  it("forces a new bend onto a right angle from the previous point", () => {
    const p = snapWirePoint({ x: 83, y: 17 }, { prev: { x: 0, y: 0 }, next: null, mode: "90" })
    expect(p).toEqual({ x: 80, y: 0 })
  })
  it("allows 45° diagonals in 45 mode", () => {
    const p = snapWirePoint({ x: 62, y: -58 }, { prev: { x: 0, y: 0 }, next: null, mode: "45" })
    expect(segmentAngle({ x: 0, y: 0 }, p)).toBe(45)
  })
  it("snaps a dragged bend to the corner that squares both neighbours", () => {
    const p = snapWirePoint({ x: 97, y: 4 }, { prev: { x: 0, y: 0 }, next: { x: 100, y: 80 }, mode: "90" })
    expect(p).toEqual({ x: 100, y: 0 })
  })
  it("placed freely with Shift", () => {
    expect(snapWirePoint({ x: 83.4, y: 17.2 }, { prev: { x: 0, y: 0 }, next: null, mode: "90", precise: true })).toEqual({ x: 83, y: 17 })
  })
  it("free mode snaps to the grid and aligns with neighbours", () => {
    expect(snapWirePoint({ x: 43, y: 58 }, { prev: { x: 40, y: 0 }, next: null, mode: "free" })).toEqual({ x: 40, y: 60 })
  })
})

describe("bend helpers", () => {
  it("squares off the last run when finishing in right-angle mode", () => {
    const out = closeOrthogonal([{ x: 50, y: 0 }], { x: 0, y: 0 }, { x: 100, y: 60 })
    expect(out).toEqual([{ x: 50, y: 0 }, { x: 50, y: 60 }])
  })
  it("does nothing when already aligned", () => {
    const pts = [{ x: 50, y: 60 }]
    expect(closeOrthogonal(pts, { x: 0, y: 0 }, { x: 100, y: 60 })).toBe(pts)
  })
  it("inserts and removes bends", () => {
    const pts = [{ x: 1, y: 1 }, { x: 3, y: 3 }]
    expect(insertBend(pts, 1, { x: 2, y: 2 })).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }])
    expect(removeBend(pts, 0)).toEqual([{ x: 3, y: 3 }])
  })
})

describe("bends follow moved parts", () => {
  it("moves bends closest to the moved end the most", () => {
    const moved = shiftWireBends(wire([{ x: 10, y: 10 }, { x: 20, y: 20 }]), "a", 30, 0)
    const pts = moved.route!.points!
    expect(pts[0].x).toBeCloseTo(10 + 30 * (1 - 1 / 3))
    expect(pts[1].x).toBeCloseTo(20 + 30 * (1 - 2 / 3))
  })
  it("leaves unrelated wires alone", () => {
    const w = wire([{ x: 1, y: 1 }])
    expect(shiftWireBends(w, "zzz", 10, 10)).toBe(w)
  })
  it("moves everything when both ends are on the moved part", () => {
    const w = { ...wire([{ x: 5, y: 5 }]), toComponentId: "a" }
    expect(shiftWireBends(w, "a", 10, -10).route!.points).toEqual([{ x: 15, y: -5 }])
  })
})

describe("reducer: drawing with bends", () => {
  it("collects bends, pops them, and keeps the angle mode across a clear", () => {
    let s = simulatorReducer(initialCanvasState, { type: "START_WIRE", fromComponentId: "a", fromPinId: "p", cursorX: 0, cursorY: 0 })
    s = simulatorReducer(s, { type: "ADD_WIRE_WAYPOINT", x: 10, y: 0 })
    s = simulatorReducer(s, { type: "ADD_WIRE_WAYPOINT", x: 10, y: 20 })
    expect(s.wireDraft?.points).toHaveLength(2)
    s = simulatorReducer(s, { type: "POP_WIRE_WAYPOINT" })
    expect(s.wireDraft?.points).toEqual([{ x: 10, y: 0 }])
    s = simulatorReducer(s, { type: "SET_WIRE_ANGLE", mode: "45" })
    s = simulatorReducer(s, { type: "CLEAR_CANVAS" })
    expect(s.wireAngle).toBe("45")
  })
})
