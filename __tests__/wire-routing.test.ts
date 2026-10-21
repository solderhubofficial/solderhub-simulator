import { describe, expect, it } from "vitest"
import {
  pinExitDirection,
  pointsToPath,
  routeWire,
  roundedPointsToPath,
  simplifyPoints,
  STUB_LENGTH,
  type Point,
  type Rect,
  type RouteEndpoint,
} from "@/lib/simulator/utils/wire-routing"
import { getComponentBounds } from "@/lib/simulator/utils/geometry"
import type { PlacedComponent } from "@/types/simulator"

const free = (x: number, y: number): RouteEndpoint => ({ x, y, dir: null })

/** True if every consecutive pair of points is axis-aligned (no diagonals). */
function isOrthogonal(points: Point[]): boolean {
  return points.every((p, i) => i === 0 || p.x === points[i - 1].x || p.y === points[i - 1].y)
}

function crossesRect(points: Point[], r: Rect): boolean {
  for (let i = 1; i < points.length; i++) {
    const [p, q] = [points[i - 1], points[i]]
    if (
      Math.max(p.x, q.x) > r.left &&
      Math.min(p.x, q.x) < r.right &&
      Math.max(p.y, q.y) > r.top &&
      Math.min(p.y, q.y) < r.bottom
    ) {
      return true
    }
  }
  return false
}

describe("simplifyPoints", () => {
  it("drops repeated points and points inside a straight run", () => {
    const out = simplifyPoints([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
    ])
    expect(out).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
    ])
  })

  it("keeps a point where the wire doubles back on itself", () => {
    const out = simplifyPoints([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 10, y: 0 },
    ])
    expect(out).toHaveLength(3)
  })
})

describe("pinExitDirection", () => {
  const bounds: Rect = { left: 0, top: 0, right: 100, bottom: 60 }

  it("leaves through the nearest edge", () => {
    expect(pinExitDirection({ x: 50, y: 4 }, bounds)).toEqual({ x: 0, y: -1 })
    expect(pinExitDirection({ x: 50, y: 56 }, bounds)).toEqual({ x: 0, y: 1 })
    expect(pinExitDirection({ x: 3, y: 30 }, bounds)).toEqual({ x: -1, y: 0 })
    expect(pinExitDirection({ x: 97, y: 30 }, bounds)).toEqual({ x: 1, y: 0 })
  })

  it("gives no direction to a pin deep inside the part", () => {
    expect(pinExitDirection({ x: 50, y: 30 }, { left: 0, top: 0, right: 100, bottom: 100 })).toBeNull()
  })
})

describe("routeWire styles", () => {
  it("draws a single right-angle bend for the straight style", () => {
    const r = routeWire(free(0, 0), free(100, 60), [], { style: "straight" })
    expect(r.points).toHaveLength(3)
    expect(r.points[0]).toEqual({ x: 0, y: 0 })
    expect(r.points[2]).toEqual({ x: 100, y: 60 })
    expect(r.handle).toBeNull()
  })

  it("bends horizontally first for hvh, with the middle segment halfway", () => {
    const r = routeWire(free(0, 0), free(100, 60), [], { style: "hvh" })
    expect(r.points).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 60 },
      { x: 100, y: 60 },
    ])
    expect(r.handle).toMatchObject({ axis: "x", orientation: "hvh", baseMid: 50, mid: 50 })
  })

  it("bends vertically first for vhv", () => {
    const r = routeWire(free(0, 0), free(100, 60), [], { style: "vhv" })
    expect(r.points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 30 },
      { x: 100, y: 30 },
      { x: 100, y: 60 },
    ])
    expect(r.handle).toMatchObject({ axis: "y", orientation: "vhv", baseMid: 30 })
  })

  it("slides the middle segment by the offset", () => {
    const r = routeWire(free(0, 0), free(100, 60), [], { style: "hvh", offset: 20 })
    expect(r.points[1]).toEqual({ x: 70, y: 0 })
    expect(r.points[2]).toEqual({ x: 70, y: 60 })
    expect(r.handle).toMatchObject({ mid: 70, baseMid: 50 })
  })

  it("collapses to one straight segment when the pins are aligned", () => {
    const r = routeWire(free(0, 40), free(100, 40), [], { style: "hvh" })
    expect(r.points).toEqual([
      { x: 0, y: 40 },
      { x: 100, y: 40 },
    ])
  })
})

describe("routeWire stubs", () => {
  it("leads out of a pin along its exit direction before turning", () => {
    const from: RouteEndpoint = { x: 50, y: 0, dir: { x: 0, y: -1 } }
    const r = routeWire(from, free(200, -100), [], { style: "vhv" })
    // first segment goes straight up by the stub length, never sideways or down
    expect(r.points[0]).toEqual({ x: 50, y: 0 })
    expect(r.points[1].x).toBe(50)
    expect(r.points[1].y).toBeLessThanOrEqual(-STUB_LENGTH)
  })
})

describe("auto routing", () => {
  it("makes a single clean bend when nothing is in the way", () => {
    const r = routeWire(free(0, 0), free(100, 60), [])
    expect(isOrthogonal(r.points)).toBe(true)
    expect(r.points.length).toBeLessThanOrEqual(3) // one bend = three points
  })

  it("routes around a part sitting between the two pins", () => {
    const wall: Rect = { left: 40, top: -80, right: 60, bottom: 80 }
    const r = routeWire(free(0, 0), free(100, 0), [wall])
    expect(isOrthogonal(r.points)).toBe(true)
    expect(crossesRect(r.points, wall)).toBe(false)
    expect(r.points[0]).toEqual({ x: 0, y: 0 })
    expect(r.points[r.points.length - 1]).toEqual({ x: 100, y: 0 })
  })

  it("is free to cross the part its own pin is inside (breadboard hole)", () => {
    const breadboard: Rect = { left: -50, top: -50, right: 150, bottom: 50 }
    const r = routeWire(free(0, 0), free(100, 20), [breadboard])
    expect(r.points.length).toBeLessThanOrEqual(4)
    expect(isOrthogonal(r.points)).toBe(true)
  })

  it("does not double back into the part it just left", () => {
    // Pin on the top edge of a board, target is straight below the board.
    const board: Rect = { left: 0, top: 0, right: 200, bottom: 100 }
    const from: RouteEndpoint = { x: 100, y: 0, dir: { x: 0, y: -1 } }
    const r = routeWire(from, free(100, 200), [board])
    expect(r.points[1].y).toBeLessThan(0) // heads up first
    expect(crossesRect(r.points.slice(1), board)).toBe(false) // then goes around, not through
  })

  it("applies the offset on top of the automatic choice", () => {
    const base = routeWire(free(0, 0), free(100, 60), [])
    const shifted = routeWire(free(0, 0), free(100, 60), [], { style: "auto", offset: 30 })
    expect(shifted.handle!.mid).toBe(base.handle!.mid + 30)
  })

  it("always ends exactly on both pins", () => {
    for (const [a, b] of [
      [free(0, 0), free(100, 60)],
      [free(100, 60), free(0, 0)],
      [free(0, 0), free(0, 80)],
      [free(30, 30), free(30, 30)],
    ] as const) {
      const r = routeWire(a, b, [])
      expect(r.points[0]).toEqual({ x: a.x, y: a.y })
      expect(r.points[r.points.length - 1]).toEqual({ x: b.x, y: b.y })
    }
  })
})

describe("pointsToPath", () => {
  it("builds SVG path data", () => {
    expect(
      pointsToPath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
      ])
    ).toBe("M 0 0 L 10 0 L 10 5")
  })
})

describe("getComponentBounds", () => {
  const component = (rotation: 0 | 90 | 180 | 270): PlacedComponent => ({
    id: "c",
    type: "x",
    name: "x",
    x: 100,
    y: 100,
    rotation,
    metadata: {},
  })

  it("covers the part at rotation 0", () => {
    expect(getComponentBounds(component(0), 40, 70)).toEqual({ left: 100, top: 100, right: 140, bottom: 170 })
  })

  it("follows the same rotation the pins use", () => {
    // rotatePoint(90): (x, y) -> (-y, x), so a 40x70 part spans x:-70..0, y:0..40 around its origin
    expect(getComponentBounds(component(90), 40, 70)).toEqual({ left: 30, top: 100, right: 100, bottom: 140 })
  })
})


describe("roundedPointsToPath junction clearance", () => {
  it("keeps adjacent rounded corners from consuming the same short leg", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 3 },
      { x: 20, y: 3 },
    ]
    const path = roundedPointsToPath(points, 8)
    expect(path).toContain("M 0 0")
    expect(path).toContain("L 20 3")
    // The 3px middle leg cannot host two large curves; the algorithm must
    // shrink the adjacent trims instead of allowing the rounded bends to overlap.
    expect(path).not.toContain("NaN")
    expect(path).not.toContain("Infinity")
  })

  it("is stable for reversed paths and all orthogonal turn orientations", () => {
    const cases = [
      [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }],
      [{ x: 20, y: 20 }, { x: 20, y: 0 }, { x: 0, y: 0 }],
      [{ x: 0, y: 20 }, { x: 0, y: 0 }, { x: 20, y: 0 }],
      [{ x: 20, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 20 }],
      [{ x: 0, y: 0 }, { x: 0, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 4 }],
      [{ x: 4, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 2 }, { x: 0, y: 2 }],
    ]
    for (const points of cases) {
      const path = roundedPointsToPath(points, 8)
      expect(path).toMatch(/^M /)
      expect(path).not.toContain("NaN")
      expect(path).not.toContain("Infinity")
    }
  })

  it("handles duplicate points and zero-length segments without invalid SVG", () => {
    const path = roundedPointsToPath([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ], 8)
    expect(path).not.toContain("NaN")
    expect(path).not.toContain("Infinity")
  })
})
