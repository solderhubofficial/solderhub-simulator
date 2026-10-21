import { describe, expect, it } from "vitest"
import { nearestOnPolyline, splitWireAt, pruneJunctions, junctionPinId } from "@/lib/simulator/utils/wire-junction"
import { routeWire, simplifyPoints, type RouteEndpoint } from "@/lib/simulator/utils/wire-routing"
import { simulatorReducer, initialCanvasState } from "@/lib/simulator/reducer"
import { getComponentDefinition, getPaletteItems } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import { getPinWorldPosition } from "@/lib/simulator/utils/geometry"
import type { Wire } from "@/types/simulator"

const wire: Wire = { id: "w", fromComponentId: "a", fromPinId: "a_P", toComponentId: "b", toPinId: "b_P" }
const from: RouteEndpoint = { x: 0, y: 0, dir: { x: 1, y: 0 } }
const to: RouteEndpoint = { x: 200, y: 100, dir: { x: -1, y: 0 } }

describe("wire junctions", () => {
  it("finds the closest point on a polyline", () => {
    const hit = nearestOnPolyline([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], { x: 103, y: 60 })
    expect(hit?.segment).toBe(1)
    expect(hit?.point).toEqual({ x: 100, y: 60 })
  })

  it("splits a wire without changing its drawn path", () => {
    const routed = routeWire(from, to, []).points
    for (let seg = 0; seg < routed.length - 1; seg++) {
      const a = routed[seg]
      const b = routed[seg + 1]
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const hit = nearestOnPolyline(routed, mid)!
      const { junction, wireA, wireB } = splitWireAt(wire, routed, hit, from, to)
      const jEnd: RouteEndpoint = { x: junction.x + 6, y: junction.y + 6, dir: null }
      const first = routeWire(from, jEnd, [], wireA.route).points
      const second = routeWire(jEnd, to, [], wireB.route).points
      const joined = simplifyPoints([...first, ...second])
      expect(joined).toEqual(simplifyPoints(routed))
      expect(wireA.toPinId).toBe(junctionPinId(junction.id))
      expect(wireB.fromPinId).toBe(junctionPinId(junction.id))
    }
  })

  it("places the junction pin exactly on the split point", () => {
    const routed = routeWire(from, to, []).points
    const hit = nearestOnPolyline(routed, { x: 100, y: 40 })!
    const { junction } = splitWireAt(wire, routed, hit, from, to)
    const def = getComponentDefinition("junction")!
    const pin = instantiatePins(junction.id, def.pinTemplates)[0]
    expect(getPinWorldPosition(junction, pin)).toEqual(hit.point)
  })

  it("INSERT_JUNCTION replaces the wire and attaches a new one; removing it prunes the junction", () => {
    const routed = routeWire(from, to, []).points
    const hit = nearestOnPolyline(routed, { x: 100, y: 40 })!
    const split = splitWireAt(wire, routed, hit, from, to)
    const branch: Wire = { id: "n", fromComponentId: "c", fromPinId: "c_P", toComponentId: split.junction.id, toPinId: junctionPinId(split.junction.id) }
    let state = { ...initialCanvasState, wires: [wire] }
    state = simulatorReducer(state, { type: "INSERT_JUNCTION", wireId: "w", ...split, connect: { kind: "add", wire: branch } })
    expect(state.wires.map((w) => w.id)).toEqual([split.wireA.id, split.wireB.id, "n"])
    expect(state.components).toHaveLength(1)
    state = simulatorReducer(state, { type: "REMOVE_WIRE", id: "n" })
    expect(state.components).toHaveLength(1)
    state = simulatorReducer(state, { type: "REMOVE_WIRE", id: split.wireA.id })
    state = simulatorReducer(state, { type: "REMOVE_WIRE", id: split.wireB.id })
    expect(state.components).toHaveLength(0)
  })

  it("rewire connect moves the dragged wire end onto the junction", () => {
    const other: Wire = { id: "r", fromComponentId: "c", fromPinId: "c_P", toComponentId: "d", toPinId: "d_P" }
    const routed = routeWire(from, to, []).points
    const split = splitWireAt(wire, routed, nearestOnPolyline(routed, { x: 100, y: 40 })!, from, to)
    const state = simulatorReducer({ ...initialCanvasState, wires: [wire, other] }, { type: "INSERT_JUNCTION", wireId: "w", ...split, connect: { kind: "rewire", wireId: "r", endpoint: "to" } })
    const r = state.wires.find((w) => w.id === "r")!
    expect(r.toComponentId).toBe(split.junction.id)
    expect(r.fromComponentId).toBe("c")
  })

  it("keeps the junction out of the palette and prunes only unused junctions", () => {
    expect(getPaletteItems().some((p) => p.type === "junction")).toBe(false)
    const j = { id: "j", type: "junction", name: "Junction", x: 0, y: 0, rotation: 0 as const, metadata: {} }
    expect(pruneJunctions([j], [])).toEqual([])
    expect(pruneJunctions([j], [{ ...wire, toComponentId: "j" }])).toEqual([j])
  })
})
