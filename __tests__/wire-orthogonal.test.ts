import { describe, expect, it } from "vitest"
import { offsetForOrientation, orthogonalBends, routeWire, customChain, simplifyPoints, type Point, type RouteEndpoint, type Direction } from "@/lib/simulator/utils/wire-routing"
import { simulatorReducer, initialCanvasState } from "@/lib/simulator/reducer"
import { pinAnchor } from "@/lib/simulator/utils/wire-anchors"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import { getComponentDefinition } from "@/lib/simulator/registry"
import type { PlacedComponent, Wire } from "@/types/simulator"

const DIRS: (Direction | null)[] = [null, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]
const isOrtho = (pts: Point[]) => pts.every((p, i) => i === 0 || Math.abs(p.x - pts[i - 1].x) < 0.75 || Math.abs(p.y - pts[i - 1].y) < 0.75)

function* scenes() {
  let seed = 7
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
  for (let i = 0; i < 400; i++) {
    const from: RouteEndpoint = { x: Math.round(rnd() * 600), y: Math.round(rnd() * 400), dir: DIRS[Math.floor(rnd() * 5)] }
    const to: RouteEndpoint = { x: Math.round(rnd() * 600), y: Math.round(rnd() * 400), dir: DIRS[Math.floor(rnd() * 5)] }
    yield { from, to }
  }
}

describe("wire routes stay at right angles", () => {
  it("every route style is horizontal/vertical runs only", () => {
    for (const { from, to } of scenes()) {
      for (const style of ["auto", "hvh", "vhv", "straight"] as const) {
        expect(isOrtho(routeWire(from, to, [], { style }).points), `${style} ${JSON.stringify({ from, to })}`).toBe(true)
      }
    }
  })

  it("switching to Horizontal/Vertical keeps the wire where the auto route already runs", () => {
    for (const { from, to } of scenes()) {
      const auto = routeWire(from, to, [])
      if (!auto.handle) continue
      const o = auto.handle.orientation
      const offset = offsetForOrientation(o, from, to, [])
      const forced = routeWire(from, to, [], offset !== 0 ? { style: o, offset } : { style: o })
      expect(forced.points).toEqual(auto.points)
    }
  })

  it("orthogonalBends squares up any slanted bend list", () => {
    for (const { from, to } of scenes()) {
      const bends = [{ x: from.x + 37, y: from.y + 53 }, { x: to.x - 21, y: to.y + 17 }]
      const fixed = orthogonalBends(from, to, bends)
      const chain = simplifyPoints(customChain(from, to, fixed))
      expect(isOrtho(chain), JSON.stringify({ from, to })).toBe(true)
    }
  })
})

describe("moving a part keeps custom wires square", () => {
  it("never leaves a slanted run", () => {
    const def = getComponentDefinition("resistor")!
    const mk = (id: string, x: number, y: number): PlacedComponent => ({ id, type: "resistor", name: "R", x, y, rotation: 0, metadata: {} })
    const a = mk("a", 0, 0)
    const b = mk("b", 300, 200)
    const pin = (c: PlacedComponent, n: string) => instantiatePins(c.id, def.pinTemplates).find((p) => p.name === n)!
    const wire: Wire = { id: "w", fromComponentId: "a", fromPinId: pin(a, "B").id, toComponentId: "b", toPinId: pin(b, "A").id, route: { style: "custom", points: [{ x: 120, y: 15 }, { x: 120, y: 215 }] } }
    let state = { ...initialCanvasState, components: [a, b], wires: [wire] }
    const steps = [[10, 0], [10, 10], [0, 30], [-20, 10], [40, -50], [7, 3], [-60, 80]]
    for (const [dx, dy] of steps) {
      const moving = state.components.find((c) => c.id === "b")!
      state = simulatorReducer(state, { type: "MOVE_COMPONENT", id: "b", x: moving.x + dx, y: moving.y + dy })
      const w = state.wires[0]
      const ca = state.components.find((c) => c.id === "a")!
      const cb = state.components.find((c) => c.id === "b")!
      const from = pinAnchor(ca, pin(ca, "B"))
      const to = pinAnchor(cb, pin(cb, "A"))
      const pts = routeWire(from, to, [], w.route).points
      expect(isOrtho(pts), JSON.stringify(pts)).toBe(true)
      expect(w.route!.points!.length).toBeLessThanOrEqual(4)
    }
  })
})
