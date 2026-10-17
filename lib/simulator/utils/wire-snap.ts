import type { WireAngleMode } from "@/types/simulator"
import type { Point } from "@/lib/simulator/utils/wire-routing"

/** Bend points land on this grid (half of the 20px main grid). */
export const BEND_GRID = 10

export interface SnapContext {
  /** The point before this one along the wire (previous bend, or the pin's lead-out). */
  prev: Point | null
  /** The point after this one, when editing a bend that already has a successor. */
  next: Point | null
  mode: WireAngleMode
  /** Canvas zoom, so snapping reach feels the same on screen at every zoom level. */
  zoom?: number
  /** Hold Shift for pixel-precise placement with no snapping. */
  precise?: boolean
}

const SQRT1_2 = Math.SQRT1_2
const AXIS: Point[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }]
const DIAGONAL: Point[] = [{ x: SQRT1_2, y: SQRT1_2 }, { x: SQRT1_2, y: -SQRT1_2 }]

const grid = (v: number) => Math.round(v / BEND_GRID) * BEND_GRID
const half = (v: number) => Math.round(v * 2) / 2
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** The angles (as unit vectors) a segment may take in the given mode. */
export function allowedDirections(mode: WireAngleMode): Point[] {
  return mode === "45" ? [...AXIS, ...DIAGONAL] : AXIS
}

function projectOnLine(origin: Point, dir: Point, q: Point): Point {
  const t = (q.x - origin.x) * dir.x + (q.y - origin.y) * dir.y
  return { x: origin.x + dir.x * t, y: origin.y + dir.y * t }
}

/** Project onto the line through `origin`, with the distance travelled rounded to the grid. */
function snapAlong(origin: Point, dir: Point, q: Point): Point {
  const t = (q.x - origin.x) * dir.x + (q.y - origin.y) * dir.y
  const isAxis = Math.abs(dir.x) > 0.99 || Math.abs(dir.y) > 0.99
  const step = isAxis ? BEND_GRID : BEND_GRID * Math.SQRT2
  const snapped = Math.round(t / step) * step
  return { x: half(origin.x + dir.x * snapped), y: half(origin.y + dir.y * snapped) }
}

function intersect(p1: Point, d1: Point, p2: Point, d2: Point): Point | null {
  const det = d1.x * d2.y - d1.y * d2.x
  if (Math.abs(det) < 1e-6) return null
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / det
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t }
}

/** Angle of the segment a→b in degrees, 0 = right, counter-clockwise positive (screen-up is 90). */
export function segmentAngle(a: Point, b: Point): number {
  const deg = (-Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
  return Math.round(((deg % 360) + 360) % 360)
}

/**
 * Snaps a raw cursor position to a tidy bend point.
 *
 * - With only a previous point (laying a new bend) the result is forced onto an allowed angle from it.
 * - With neighbours on both sides (dragging an existing bend) it snaps to the spot where both
 *   segments sit on allowed angles when that is close, otherwise to the nearest single guide line.
 * - "free" mode only snaps to the grid and soft-aligns with neighbours.
 */
export function snapWirePoint(raw: Point, ctx: SnapContext): Point {
  const zoom = ctx.zoom && ctx.zoom > 0 ? ctx.zoom : 1
  if (ctx.precise) return { x: Math.round(raw.x), y: Math.round(raw.y) }
  const { prev, next, mode } = ctx

  if (mode === "free" || (!prev && !next)) {
    const p = { x: grid(raw.x), y: grid(raw.y) }
    const reach = Math.max(6, 10 / zoom)
    for (const ref of [prev, next]) {
      if (!ref) continue
      if (Math.abs(raw.x - ref.x) <= reach) p.x = ref.x
      if (Math.abs(raw.y - ref.y) <= reach) p.y = ref.y
    }
    return p
  }

  const dirs = allowedDirections(mode)
  const radius = Math.max(10, 22 / zoom)

  if (prev && next) {
    let best: Point | null = null
    let bestDist = Infinity
    for (const a of dirs) {
      for (const b of dirs) {
        const hit = intersect(prev, a, next, b)
        if (!hit) continue
        const d = dist(hit, raw)
        if (d < bestDist) { best = hit; bestDist = d }
      }
    }
    if (best && bestDist <= radius) return { x: half(best.x), y: half(best.y) }

    let single: Point | null = null
    let singleDist = Infinity
    for (const ref of [prev, next]) {
      for (const d of dirs) {
        const gap = dist(projectOnLine(ref, d, raw), raw)
        if (gap < singleDist) { singleDist = gap; single = snapAlong(ref, d, raw) }
      }
    }
    if (single && singleDist <= radius / 2) return single
    return { x: grid(raw.x), y: grid(raw.y) }
  }

  const ref = (prev ?? next)!
  let bestDir = dirs[0]
  let bestGap = Infinity
  for (const d of dirs) {
    const gap = dist(projectOnLine(ref, d, raw), raw)
    if (gap < bestGap) { bestGap = gap; bestDir = d }
  }
  return snapAlong(ref, bestDir, raw)
}
