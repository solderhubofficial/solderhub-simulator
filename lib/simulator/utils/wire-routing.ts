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
/** Slack when deciding whether two points are on the same horizontal/vertical line (bends are stored to half a pixel). */
const ORTHO_TOL = 0.75

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

export function stubEnd(e: RouteEndpoint): Point {
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
  obstacles: Rect[],
  only?: "hvh" | "vhv"
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

  let best: { orientation: "hvh" | "vhv"; mid: number } = only === "vhv" ? { orientation: "vhv", mid: baseY } : { orientation: "hvh", mid: baseX }
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
  if (only !== "vhv") for (const x of nearest(xs, baseX)) consider("hvh", x)
  if (only !== "hvh") for (const y of nearest(ys, baseY)) consider("vhv", y)
  return best
}

/**
 * The offset that makes a forced "hvh"/"vhv" route sit where the automatic router would put the middle
 * run for that orientation, so picking Horizontal/Vertical keeps the wire where it is instead of jumping
 * to the geometric midpoint.
 */
export function offsetForOrientation(
  orientation: "hvh" | "vhv",
  from: RouteEndpoint,
  to: RouteEndpoint,
  obstacles: Rect[]
): number {
  const a = stubEnd(from)
  const b = stubEnd(to)
  const best = pickBest(a, b, from, to, obstacles, orientation)
  const base = orientation === "hvh" ? (a.x + b.x) / 2 : (a.y + b.y) / 2
  return Math.round((best.mid - base) * 2) / 2
}

/**
 * Makes every run of a custom wire horizontal or vertical. Where two consecutive points are not
 * axis-aligned a corner is added, turning away from the previous run so the wire keeps alternating.
 * Returns the bend points only (lead-outs and pins are implied) with redundant ones removed.
 */
export function orthogonalBends(from: RouteEndpoint, to: RouteEndpoint, bends: Point[]): Point[] {
  const start = stubEnd(from)
  const end = stubEnd(to)
  const targets = [...bends, ...(to.dir ? [end] : []), { x: to.x, y: to.y }]
  let prevAxis: "h" | "v" | null = from.dir ? (from.dir.x !== 0 ? "h" : "v") : null
  let cur: Point = start
  const out: Point[] = []
  for (const t of targets) {
    const dx = Math.abs(t.x - cur.x)
    const dy = Math.abs(t.y - cur.y)
    if (dx > ORTHO_TOL && dy > ORTHO_TOL) {
      // Turn away from the previous run (horizontal -> go vertical first); with no history, go horizontal first.
      const corner = prevAxis === "h" ? { x: cur.x, y: t.y } : { x: t.x, y: cur.y }
      out.push(corner)
      prevAxis = prevAxis === "h" ? "v" : "h"
      cur = corner
    }
    const ddx = Math.abs(t.x - cur.x)
    const ddy = Math.abs(t.y - cur.y)
    if (ddx > ORTHO_TOL) prevAxis = "h"
    else if (ddy > ORTHO_TOL) prevAxis = "v"
    out.push({ x: t.x, y: t.y })
    cur = t
  }
  // Drop the trailing lead-out/pin targets and collapse collinear or repeated points.
  const chain = simplifyPoints([{ x: from.x, y: from.y }, ...(from.dir ? [start] : []), ...out])
  const near = (p: Point, q: Point) => Math.abs(p.x - q.x) < ORTHO_TOL && Math.abs(p.y - q.y) < ORTHO_TOL
  return chain.filter((p) => !near(p, from) && !near(p, start) && !near(p, end) && !near(p, to))
}

/**
 * The full chain a custom wire follows: pin, its lead-out stub, the user's bend points,
 * the other pin's lead-out stub, other pin. Not simplified, so handles can map to bend indices.
 */
export function customChain(from: RouteEndpoint, to: RouteEndpoint, points: Point[]): Point[] {
  const chain: Point[] = [{ x: from.x, y: from.y }]
  if (from.dir) chain.push(stubEnd(from))
  chain.push(...points.map((p) => ({ x: p.x, y: p.y })))
  if (to.dir) chain.push(stubEnd(to))
  chain.push({ x: to.x, y: to.y })
  return chain
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

  // A wire that ends on a bare point (a junction) lying on the pin's lead-out, closer than the lead-out is long,
  // simply runs straight there instead of overshooting and doubling back.
  const shortLead = (pin: RouteEndpoint, bare: RouteEndpoint) => {
    if (!pin.dir || bare.dir) return false
    const along = (bare.x - pin.x) * pin.dir.x + (bare.y - pin.y) * pin.dir.y
    const across = Math.abs((bare.x - pin.x) * pin.dir.y) + Math.abs((bare.y - pin.y) * pin.dir.x)
    return across < EPS && along >= 0 && along <= STUB_LENGTH
  }
  if (style !== "custom" && (shortLead(from, to) || shortLead(to, from))) {
    return { points: [{ x: from.x, y: from.y }, { x: to.x, y: to.y }], handle: null }
  }

  if (style === "straight") {
    // Always right angles: a direct run when the lead-outs line up, otherwise the single-bend "L" that
    // collides least.
    const a = stubEnd(from)
    const b = stubEnd(to)
    const aligned = Math.abs(a.x - b.x) < EPS || Math.abs(a.y - b.y) < EPS
    let core: Point[] = [a, b]
    if (!aligned) {
      const lH = corePoints(a, b, "hvh", b.x)
      const lV = corePoints(a, b, "vhv", b.y)
      const active = obstacles.filter((r) => !contains(r, a) && !contains(r, b))
      core = scoreCore(lH, from.dir, to.dir, active) <= scoreCore(lV, from.dir, to.dir, active) ? lH : lV
    }
    return { points: simplifyPoints([{ x: from.x, y: from.y }, ...core, { x: to.x, y: to.y }]), handle: null }
  }

  if (style === "custom" && route?.points && route.points.length > 0) {
    return { points: simplifyPoints(customChain(from, to, route.points)), handle: null }
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

  // A middle run within a pixel of a lead-out line is that line: avoids sub-pixel jogs from rounded offsets.
  const [lo, hi] = orientation === "hvh" ? [a.x, b.x] : [a.y, b.y]
  if (Math.abs(mid - lo) < 0.75) mid = lo
  else if (Math.abs(mid - hi) < 0.75) mid = hi

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

/** Default corner radius for drawn wires, in px. */
export const WIRE_CORNER_RADIUS = 8

/**
 * Like pointsToPath, but every bend is softly rounded the way a real jumper
 * wire curves. The radius shrinks on short legs so it never overshoots.
 */
export function roundedPointsToPath(points: Point[], radius = WIRE_CORNER_RADIUS): string {
  if (points.length < 3) return pointsToPath(points)

  // Calculate each corner's desired trim first. Independently limiting each
  // corner to half of each leg is not enough: two adjacent corners can consume
  // the same short segment, causing their curves/strokes to collide at joints.
  const trims = points.map(() => 0)
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    const next = points[i + 1]
    const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y)
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y)
    if (inLen > EPS && outLen > EPS) trims[i] = Math.min(radius, inLen / 2, outLen / 2)
  }

  // Reserve a small straight section between neighboring rounded corners.
  // If both corners share a short leg, shrink both trims proportionally.
  const clearance = 2
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const legLen = Math.hypot(b.x - a.x, b.y - a.y)
    const startTrim = i > 0 ? trims[i] : 0
    const endTrim = i + 1 < points.length - 1 ? trims[i + 1] : 0
    const available = Math.max(0, legLen - clearance)
    const total = startTrim + endTrim
    if (total > available && total > 0) {
      const scale = available / total
      if (i > 0) trims[i] *= scale
      if (i + 1 < points.length - 1) trims[i + 1] *= scale
    }
  }

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    const next = points[i + 1]
    const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y)
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y)
    const r = trims[i]
    if (r < 0.5 || inLen < EPS || outLen < EPS) {
      d += ` L ${cur.x} ${cur.y}`
      continue
    }
    const a = { x: cur.x - ((cur.x - prev.x) / inLen) * r, y: cur.y - ((cur.y - prev.y) / inLen) * r }
    const b = { x: cur.x + ((next.x - cur.x) / outLen) * r, y: cur.y + ((next.y - cur.y) / outLen) * r }
    d += ` L ${a.x} ${a.y} Q ${cur.x} ${cur.y} ${b.x} ${b.y}`
  }
  const last = points[points.length - 1]
  return `${d} L ${last.x} ${last.y}`
}

/** Spacing between parallel wires that connect the same two parts, in px. */
export const LANE_SPACING = 7

/**
 * Sideways offsets that fan out wires sharing the same pair of parts, so
 * parallel runs sit next to each other instead of on top of each other.
 * Returns wire id -> offset (0 for a wire that has the pair to itself).
 */
export function laneOffsets(
  wires: { id: string; fromComponentId: string; toComponentId: string }[]
): Map<string, number> {
  const groups = new Map<string, string[]>()
  for (const w of wires) {
    const key = [w.fromComponentId, w.toComponentId].sort().join("|")
    const ids = groups.get(key) ?? []
    ids.push(w.id)
    groups.set(key, ids)
  }
  const offsets = new Map<string, number>()
  for (const ids of groups.values()) {
    ids.forEach((id, i) => offsets.set(id, (i - (ids.length - 1) / 2) * LANE_SPACING))
  }
  return offsets
}
