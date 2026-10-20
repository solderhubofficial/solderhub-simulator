// Exhaustive wiring audit: every registered part x every rotation, pin geometry, exit directions and
// automatic routes between parts. These are structural invariants a correct wire must always satisfy.
import { describe, expect, it } from "vitest"
import { getAllDefinitions, getComponentDefinition } from "@/lib/simulator/registry"
import { getComponentBounds, getPinWorldPosition, rotatePoint } from "@/lib/simulator/utils/geometry"
import { pinAnchor } from "@/lib/simulator/utils/wire-anchors"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import { routeWire, stubEnd, type Point, type Rect } from "@/lib/simulator/utils/wire-routing"
import type { PlacedComponent } from "@/types/simulator"

type Rot = 0 | 90 | 180 | 270
const ROTS: Rot[] = [0, 90, 180, 270]

function place(type: string, x: number, y: number, rotation: Rot): PlacedComponent {
  const def = getComponentDefinition(type)!
  return { id: `${type}-${x}-${y}-${rotation}`, type, name: def.name, x, y, rotation, metadata: { ...def.defaultMetadata } } as PlacedComponent
}
const pinsOf = (c: PlacedComponent) => instantiatePins(c.id, getComponentDefinition(c.type)!.pinTemplates)
const boundsOf = (c: PlacedComponent): Rect => { const d = getComponentDefinition(c.type)!; return getComponentBounds(c, d.width, d.height) }
const defs = getAllDefinitions().filter((d) => d.pinTemplates.length > 0)

describe("pin geometry", () => {
  it("every pin sits inside its part's bounds at every rotation", () => {
    const bad: string[] = []
    for (const d of defs) for (const r of ROTS) {
      const c = place(d.type, 500, 400, r)
      const b = boundsOf(c)
      for (const p of pinsOf(c)) {
        const w = getPinWorldPosition(c, p)
        if (w.x < b.left - 8 || w.x > b.right + 8 || w.y < b.top - 8 || w.y > b.bottom + 8) bad.push(`${d.type}/${p.name}@${r}`)
      }
    }
    expect([...new Set(bad.map((s) => s.split("@")[0]))]).toEqual([])
  })

  it("a pin's exit direction turns with the part", () => {
    const rotDir = (dir: { x: number; y: number }, r: Rot) => { const v = rotatePoint(dir.x, dir.y, r); return { x: v.x + 0, y: v.y + 0 } }
    const bad: string[] = []
    for (const d of defs) {
      const base = place(d.type, 500, 400, 0)
      for (const p of pinsOf(base)) {
        const d0 = pinAnchor(base, p).dir
        // A pin exactly in a corner is equally close to two edges: either exit is correct, so skip those.
        const b0 = boundsOf(base), w0 = getPinWorldPosition(base, p)
        const dists = [w0.y - b0.top, b0.bottom - w0.y, w0.x - b0.left, b0.right - w0.x].sort((x, y) => x - y)
        if (Math.abs(dists[0] - dists[1]) < 0.01) continue
        for (const r of [90, 180, 270] as Rot[]) {
          const c = place(d.type, 500, 400, r)
          const dr = pinAnchor(c, { ...p, id: p.id }).dir
          const expected = d0 ? rotDir(d0, r) : null
          if (JSON.stringify(dr) !== JSON.stringify(expected && { x: expected.x, y: expected.y })) bad.push(`${d.type}/${p.name}@${r}`)
        }
      }
    }
    expect(bad.slice(0, 20)).toEqual([])
  })
})

describe("automatic routes between parts", () => {
  const partners = ["led", "resistor", "esp32-devkit", "arduino-uno", "lcd1602", "breadboard", "push-button"].filter((t) => getComponentDefinition(t))
  // Offsets chosen so the parts never overlap (the second part is clear of the first on at least one axis).
  const gaps = [{ dx: 900, dy: 0 }, { dx: -900, dy: 0 }, { dx: 0, dy: 700 }, { dx: 0, dy: -700 }, { dx: 700, dy: 600 }, { dx: -700, dy: -600 }]
  const pick = (ps: ReturnType<typeof pinsOf>) => [ps[0], ps[Math.floor(ps.length / 2)], ps[ps.length - 1]].filter(Boolean)

  it("never produce NaN, diagonal or doubled-back first segments, and always end on the pins", () => {
    const failures: string[] = []
    let routes = 0
    for (const d of defs) for (const partner of partners) for (const r1 of ROTS) for (const r2 of ROTS) for (const g of gaps) {
      const a = place(d.type, 1500, 1500, r1)
      const b = place(partner, 1500 + g.dx, 1500 + g.dy, r2)
      const obstacles = [boundsOf(a), boundsOf(b)]
      for (const pa of pick(pinsOf(a))) for (const pb of pick(pinsOf(b))) {
        const from = pinAnchor(a, pa), to = pinAnchor(b, pb)
        const tag = `${d.type}/${pa.name}@${r1} -> ${partner}/${pb.name}@${r2} (${g.dx},${g.dy})`
        const { points } = routeWire(from, to, obstacles)
        routes++
        if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) { failures.push(`NaN ${tag}`); continue }
        const first = points[0], last = points[points.length - 1]
        if (Math.hypot(first.x - from.x, first.y - from.y) > 0.01 || Math.hypot(last.x - to.x, last.y - to.y) > 0.01) failures.push(`ends ${tag}`)
        for (let i = 1; i < points.length; i++) {
          const dx = Math.abs(points[i].x - points[i - 1].x), dy = Math.abs(points[i].y - points[i - 1].y)
          if (dx > 0.01 && dy > 0.01) { failures.push(`diagonal ${tag}`); break }
        }
        if (from.dir && points.length > 1) {
          const dot = Math.sign(points[1].x - points[0].x) * from.dir.x + Math.sign(points[1].y - points[0].y) * from.dir.y
          if (dot < 0) failures.push(`reverse-from ${tag}`)
        }
        if (to.dir && points.length > 1) {
          const n = points.length
          const dot = Math.sign(points[n - 2].x - points[n - 1].x) * to.dir.x + Math.sign(points[n - 2].y - points[n - 1].y) * to.dir.y
          if (dot < 0) failures.push(`reverse-to ${tag}`)
        }
      }
    }
    console.log(`audited ${routes} routes, ${failures.length} failures`)
    const byKind = failures.reduce<Record<string, number>>((m, f) => { const k = f.split(" ")[0]; m[k] = (m[k] ?? 0) + 1; return m }, {})
    console.log(JSON.stringify(byKind), failures.slice(0, 8).join("\n"))
    expect(failures.length).toBe(0)
  })
})
