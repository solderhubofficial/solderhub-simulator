import type { WireRoute } from "@/types/simulator"

export interface Point {
  x: number
  y: number
}

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

/** Unit step pointing away from a component, e.g. {x: 0, y: -1} for "up". */
export interface Direction {
  x: -1 | 0 | 1
  y: -1 | 0 | 1
}

export interface RouteEndpoint extends Point {
  /** Which way the wire should leave the component, or null if it can leave any way. */
  dir: Direction | null
}

/** The grab point on a wire's movable middle segment. */
export interface RouteHandle extends Point {
  /** The axis the segment moves along when dragged ("x": a vertical segment). */
  axis: "x" | "y"
  /** Which bend layout the segment belongs to; stored as the wire's style once dragged. */
  orientation: "hvh" | "vhv"
  /** Where the middle segment sits with offset 0 (midway between the two ends). */
  baseMid: number
  /** Where the middle segment currently sits, along `axis`. */
  mid: number
}

export interface RoutedWire {
  points: Point[]
  handle: RouteHandle | null
}

/** Length of the straight lead-out a wire makes before turning, in px. */
export const STUB_LENGTH = 14
/** Pins further than this from a component edge get no lead-out direction. */
export const EDGE_THRESHOLD = 24

const OBSTACLE_MARGIN = 6
const BEND_PENALTY = 18
const COLLISION_PENALTY = 1000
const REVERSE_PENALTY = 300
const VHV_TIEBREAK = 0.5
const MAX_CANDIDATES = 24
const EPS = 0.01

/**
 * Which way a wire should leave a pin: straight out through the nearest edge
 * of its component. Pins deep inside a part (a breadboard hole) return null.
 */
export function pinExitDirection(pin: Point, bounds: Rect): Direction | null {
  const edges: { dist: number; dir: Direction }[] = [
    { dist: pin.y - bounds.top, dir: { x: 0, y: -1 } },
    { dist: bounds.bottom - pin.y, dir: { x: 0, y: 1 } },
    { dist: pin.x - bounds.left, dir: { x: -1, y: 0 } },
    { dist: bounds.right - pin.x, dir: { x: 1, y: 0 } },
  ]
  let best = edges[0]
  for (const edge of edges) if (edge.dist < best.dist) best = edge
  return best.dist <= EDGE_THRESHOLD ? best.dir : null
}

function contains(rect: Rect, p: Point): boolean {
  return p.x > rect.left && p.x < rect.right && p.y > rect.top && p.y < rect.bottom
}

function segmentHitsRect(p: Point, q: Point, r: Rect): boolean {
  const minX = Math.min(p.x, q.x)
  const maxX = Math.max(p.x, q.x)
  const minY = Math.min(p.y, q.y)
  const maxY = Math.max(p.y, q.y)
  if (maxX - minX < EPS && maxY - minY < EPS) return false
  return maxX > r.left && minX < r.right && maxY > r.top && minY < r.bottom
}

/** Drops repeated points and points that sit in the middle of a straight run. */
export function simplifyPoints(points: Point[]): Point[] {
  const deduped: Point[] = []
  for (const p of points) {
    const last = deduped[deduped.length - 1]
    if (!last || Math.abs(last.x - p.x) > EPS || Math.abs(last.y - p.y) > EPS) deduped.push(p)
  }
  const out: Point[] = []
  for (const p of deduped) {
    while (out.length >= 2) {
      const a = out[out.length - 2]
      const b = out[out.length - 1]
      const cross = (b.x - a.x) * (p.y - b.y) - (b.y - a.y) * (p.x - b.x)
      const dot = (b.x - a.x) * (p.x - b.x) + (b.y - a.y) * (p.y - b.y)
      if (Math.abs(cross) < EPS && dot >= 0) out.pop()
      else break
    }
    out.push(p)
  }
  return out
}

function stubEnd(e: RouteEndpoint): Point {
  return e.dir ? { x: e.x + e.dir.x * STUB_LENGTH, y: e.y + e.dir.y * STUB_LENGTH } : { x: e.x, y: e.y }
}

function corePoints(a: Point, b: Point, orientation: "hvh" | "vhv", mid: number): Point[] {
  return orientation === "hvh"
    ? [a, { x: mid, y: a.y }, { x: mid, y: b.y }, b]
    : [a, { x: a.x, y: mid }, { x: b.x, y: mid }, b]
}

function scoreCore(
  core: Point[],
  fromDir: Direction | null,
  toDir: Direction | null,
  obstacles: Rect[]
): number {
  const pts = simplifyPoints(core)
  let length = 0
  let collisions = 0
  for (let i = 1; i < pts.length; i++) {
    length += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y)
    for (const rect of obstacles) {
      if (segmentHitsRect(pts[i - 1], pts[i], rect)) collisions += 1
    }
  }
  const bends = Math.max(0, pts.length - 2)
  let cost = length + bends * BEND_PENALTY + collisions * COLLISION_PENALTY

  // Penalize doubling back into the component the wire just left (or is about to enter).
  if (pts.length >= 2) {
    if (fromDir) {
      const dx = Math.sign(pts[1].x - pts[0].x)
      const dy = Math.sign(pts[1].y - pts[0].y)
      if (dx * fromDir.x + dy * fromDir.y < 0) cost += REVERSE_PENALTY
    }
    if (toDir) {
      const n = pts.length
      const dx = Math.sign(pts[n - 1].x - pts[n - 2].x)
      const dy = Math.sign(pts[n - 1].y - pts[n - 2].y)
      if (dx * toDir.x + dy * toDir.y > 0) cost += REVERSE_PENALTY
    }
  }
  return cost
}

function pickBest(
  a: Point,
  b: Point,
  from: RouteEndpoint,
  to: RouteEndpoint,
  obstacles: Rect[]
): { orientation: "hvh" | "vhv"; mid: number } {
  // A part that contains a lead-out end has no lead-out stub (the pin is deep
  // inside it), so the wire must be free to cross that part.
  const active = obstacles
    .map((r) => ({
      left: r.left - OBSTACLE_MARGIN / 3,
      top: r.top - OBSTACLE_MARGIN / 3,
      right: r.right + OBSTACLE_MARGIN / 3,
      bottom: r.bottom + OBSTACLE_MARGIN / 3,
    }))
    .filter((r) => !contains(r, a) && !contains(r, b))

  const baseX = (a.x + b.x) / 2
  const baseY = (a.y + b.y) / 2
  const xs = new Set<number>([baseX, a.x, b.x])
  const ys = new Set<number>([baseY, a.y, b.y])
  for (const r of obstacles) {
    xs.add(r.left - OBSTACLE_MARGIN)
    xs.add(r.right + OBSTACLE_MARGIN)
    ys.add(r.top - OBSTACLE_MARGIN)
    ys.add(r.bottom + OBSTACLE_MARGIN)
  }
  const nearest = (values: Set<number>, base: number) =>
    Array.from(values)
      .sort((p, q) => Math.abs(p - base) - Math.abs(q - base))
      .slice(0, MAX_CANDIDATES)

  let best: { orientation: "hvh" | "vhv"; mid: number } = { orientation: "hvh", mid: baseX }
  let bestCost = Infinity
  const consider = (orientation: "hvh" | "vhv", mid: number) => {
    const cost =
      scoreCore(corePoints(a, b, orientation, mid), from.dir, to.dir, active) +
      (orientation === "vhv" ? VHV_TIEBREAK : 0)
    if (cost < bestCost - EPS) {
      bestCost = cost
      best = { orientation, mid }
    }
  }
  for (const x of nearest(xs, baseX)) consider("hvh", x)
  for (const y of nearest(ys, baseY)) consider("vhv", y)
  return best
}

/**
 * Lays out a wire as straight orthogonal segments between two pins.
 *
 * "auto" tries many bend positions and keeps the cheapest: fewest bends and
 * shortest, without cutting through other parts. "hvh" / "vhv" force the bend
 * direction, and "straight" draws a direct line. `offset` slides the middle
 * segment sideways, which is what dragging the wire's handle does.
 */
export function routeWire(
  from: RouteEndpoint,
  to: RouteEndpoint,
  obstacles: Rect[],
  route?: WireRoute | null
): RoutedWire {
  const style = route?.style ?? "auto"
  const offset = route?.offset ?? 0

  if (style === "straight") {
    return { points: simplifyPoints([from, to].map((p) => ({ x: p.x, y: p.y }))), handle: null }
  }

  const a = stubEnd(from)
  const b = stubEnd(to)
  const baseX = (a.x + b.x) / 2
  const baseY = (a.y + b.y) / 2

  let orientation: "hvh" | "vhv"
  let mid: number
  if (style === "hvh") {
    orientation = "hvh"
    mid = baseX + offset
  } else if (style === "vhv") {
    orientation = "vhv"
    mid = baseY + offset
  } else {
    const best = pickBest(a, b, from, to, obstacles)
    orientation = best.orientation
    mid = best.mid + offset
  }

  const core = corePoints(a, b, orientation, mid)
  const points = simplifyPoints([{ x: from.x, y: from.y }, ...core, { x: to.x, y: to.y }])
  const handle: RouteHandle =
    orientation === "hvh"
      ? { x: mid, y: (a.y + b.y) / 2, axis: "x", orientation, baseMid: baseX, mid }
      : { x: (a.x + b.x) / 2, y: mid, axis: "y", orientation, baseMid: baseY, mid }

  return { points, handle }
}

/** SVG path data for a polyline. */
export function pointsToPath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
}
