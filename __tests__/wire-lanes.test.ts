import { describe, expect, it } from "vitest"
import { LANE_CLOSE, spreadOverlappingRuns, type LaneWire } from "@/lib/simulator/utils/wire-lanes"
import { LANE_SPACING, STUB_LENGTH, type Point } from "@/lib/simulator/utils/wire-routing"

/** Header pins at y=200 facing up, a part above at y=0 facing down: every wire is pin, stub, run, run, stub, pin. */
function headerWire(id: string, pinX: number, partX: number, runY = 186): LaneWire {
  const points: Point[] = [
    { x: pinX, y: 200 },
    { x: pinX, y: runY },
    { x: partX, y: runY },
    { x: partX, y: 14 },
    { x: partX, y: 0 },
  ]
  return { id, points, movable: true }
}

function runsOverlap(a: Point[], b: Point[]): boolean {
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      const horizontal = a[i].y === a[i + 1].y && b[j].y === b[j + 1].y
      const vertical = a[i].x === a[i + 1].x && b[j].x === b[j + 1].x
      if (horizontal && Math.abs(a[i].y - b[j].y) < LANE_CLOSE) {
        const lo = Math.max(Math.min(a[i].x, a[i + 1].x), Math.min(b[j].x, b[j + 1].x))
        const hi = Math.min(Math.max(a[i].x, a[i + 1].x), Math.max(b[j].x, b[j + 1].x))
        if (hi - lo > 1) return true
      }
      if (vertical && Math.abs(a[i].x - b[j].x) < LANE_CLOSE) {
        const lo = Math.max(Math.min(a[i].y, a[i + 1].y), Math.min(b[j].y, b[j + 1].y))
        const hi = Math.min(Math.max(a[i].y, a[i + 1].y), Math.max(b[j].y, b[j + 1].y))
        if (hi - lo > 1) return true
      }
    }
  }
  return false
}

describe("spreadOverlappingRuns", () => {
  it("leaves wires that do not overlap untouched", () => {
    const a = headerWire("a", 100, 40, 186)
    const b = headerWire("b", 300, 360, 150)
    const out = spreadOverlappingRuns([a, b], [])
    expect(out.get("a")!.points).toEqual(a.points)
    expect(out.get("b")!.shifts).toEqual([])
  })

  it("separates wires that share the same run", () => {
    const wires = [headerWire("a", 100, 40), headerWire("b", 110, 50), headerWire("c", 120, 60)]
    const out = spreadOverlappingRuns(wires, [])
    const [a, b, c] = ["a", "b", "c"].map((id) => out.get(id)!.points)
    expect(runsOverlap(a, b)).toBe(false)
    expect(runsOverlap(a, c)).toBe(false)
    expect(runsOverlap(b, c)).toBe(false)
    const ys = [a[1].y, b[1].y, c[1].y].sort((p, q) => p - q)
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(LANE_SPACING - 0.01)
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(LANE_SPACING - 0.01)
  })

  it("never moves the pins and keeps every wire orthogonal", () => {
    const wires = [headerWire("a", 100, 40), headerWire("b", 110, 50), headerWire("c", 120, 60), headerWire("d", 130, 70)]
    const out = spreadOverlappingRuns(wires, [])
    for (const w of wires) {
      const pts = out.get(w.id)!.points
      expect(pts[0]).toEqual(w.points[0])
      expect(pts[pts.length - 1]).toEqual(w.points[w.points.length - 1])
      for (let i = 0; i < pts.length - 1; i++) {
        expect(pts[i].x === pts[i + 1].x || pts[i].y === pts[i + 1].y).toBe(true)
      }
    }
  })

  it("keeps the lead-out at each pin and never doubles back into the part", () => {
    const wires = [headerWire("a", 100, 40), headerWire("b", 110, 50), headerWire("c", 120, 60)]
    const out = spreadOverlappingRuns(wires, [])
    for (const w of wires) {
      const pts = out.get(w.id)!.points
      // Pin is at y=200 and the wire leaves upward: the run must stay at least a lead-out above it.
      expect(200 - pts[1].y).toBeGreaterThanOrEqual(STUB_LENGTH - 0.01)
    }
  })

  it("orders lanes so the wires do not cross each other", () => {
    // Pins a, b, c left to right all run left to parts at x = 20, 30, 40. Only one lane order
    // avoids every crossing: the wire turning off furthest out (a) takes the lane nearest the header.
    const wires = [headerWire("a", 100, 20), headerWire("b", 110, 30), headerWire("c", 120, 40)]
    const out = spreadOverlappingRuns(wires, [])
    const laneY = (id: string) => out.get(id)!.points[1].y
    expect(laneY("a")).toBeGreaterThan(laneY("b"))
    expect(laneY("b")).toBeGreaterThan(laneY("c"))
  })

  it("does not move wires with a user-chosen route, and works around them", () => {
    const fixed: LaneWire = { ...headerWire("fixed", 100, 40), movable: false }
    const free = headerWire("free", 110, 50)
    const out = spreadOverlappingRuns([fixed, free], [])
    expect(out.get("fixed")!.points).toEqual(fixed.points)
    expect(runsOverlap(out.get("fixed")!.points, out.get("free")!.points)).toBe(false)
  })

  it("does not slide a run into another part", () => {
    const wires = [headerWire("a", 100, 40), headerWire("b", 110, 50)]
    // A part sitting where the upper lane would go.
    const out = spreadOverlappingRuns(wires, [{ left: 0, top: 160, right: 300, bottom: 180 }])
    for (const w of wires) {
      for (const p of out.get(w.id)!.points) expect(p.y < 160 || p.y > 180).toBe(true)
    }
  })

  it("reports the slides so a drag handle can follow its segment", () => {
    const out = spreadOverlappingRuns([headerWire("a", 100, 40), headerWire("b", 110, 50)], [])
    const moved = [...out.values()].flatMap((r) => r.shifts)
    expect(moved.length).toBeGreaterThan(0)
    expect(moved.every((s) => s.axis === "y" && Math.abs(s.delta) > 0)).toBe(true)
  })
})
