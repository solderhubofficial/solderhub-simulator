import type { PlacedComponent, Wire } from "@/types/simulator"
import { generateId } from "@/lib/simulator/utils/id"
import { stubEnd, type Point, type RouteEndpoint } from "@/lib/simulator/utils/wire-routing"

/** Side of a junction part's box; its single pin sits at the centre. */
export const JUNCTION_SIZE = 12
export const JUNCTION_TYPE = "junction"
export const JUNCTION_PIN_NAME = "P"

const EPS = 0.5

export interface PolylineHit {
  point: Point
  /** Index of the segment (points[segment] -> points[segment + 1]) the point lies on. */
  segment: number
  distance: number
}

/** The point on a polyline closest to `p`. */
export function nearestOnPolyline(points: Point[], p: Point): PolylineHit | null {
  let best: PolylineHit | null = null
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
    const point = { x: a.x + dx * t, y: a.y + dy * t }
    const distance = Math.hypot(p.x - point.x, p.y - point.y)
    if (!best || distance < best.distance) best = { point, segment: i, distance }
  }
  return best
}

export function junctionPinId(junctionId: string): string {
  return `${junctionId}_${JUNCTION_PIN_NAME}`
}

const same = (a: Point, b: Point) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS

function routeFor(bends: Point[]): Wire["route"] | undefined {
  return bends.length > 0 ? { style: "custom", points: bends } : undefined
}

export interface WireSplit {
  junction: PlacedComponent
  wireA: Wire
  wireB: Wire
}

/**
 * Splits `wire` in two at `hit`, with a junction part at the split point. The halves keep the
 * exact path the original wire had, so nothing visibly moves.
 *
 * `routed` is the wire's drawn polyline (pin to pin); `fromEnd`/`toEnd` its endpoints, used so the
 * pin lead-outs are not duplicated as bend points.
 */
export function splitWireAt(
  wire: Wire,
  routed: Point[],
  hit: PolylineHit,
  fromEnd: RouteEndpoint,
  toEnd: RouteEndpoint
): WireSplit {
  const junctionId = generateId("comp")
  const junction: PlacedComponent = {
    id: junctionId,
    type: JUNCTION_TYPE,
    name: "Junction",
    x: hit.point.x - JUNCTION_SIZE / 2,
    y: hit.point.y - JUNCTION_SIZE / 2,
    rotation: 0,
    metadata: {},
  }

  const dropEnd = (pts: Point[]) => pts.filter((p) => !same(p, hit.point))
  let left = dropEnd(routed.slice(1, hit.segment + 1))
  let right = dropEnd(routed.slice(hit.segment + 1, routed.length - 1))
  if (left.length > 1 && fromEnd.dir && same(left[0], stubEnd(fromEnd))) left = left.slice(1)
  if (right.length > 1 && toEnd.dir && same(right[right.length - 1], stubEnd(toEnd))) right = right.slice(0, -1)

  const pinId = junctionPinId(junctionId)
  const wireA: Wire = {
    id: generateId("wire"),
    fromComponentId: wire.fromComponentId,
    fromPinId: wire.fromPinId,
    toComponentId: junctionId,
    toPinId: pinId,
    ...(wire.color ? { color: wire.color } : {}),
    route: routeFor(left),
  }
  const wireB: Wire = {
    id: generateId("wire"),
    fromComponentId: junctionId,
    fromPinId: pinId,
    toComponentId: wire.toComponentId,
    toPinId: wire.toPinId,
    ...(wire.color ? { color: wire.color } : {}),
    route: routeFor(right),
  }
  return { junction, wireA, wireB }
}

/** Drops junction parts that no wire uses any more. */
export function pruneJunctions(components: PlacedComponent[], wires: Wire[]): PlacedComponent[] {
  const used = new Set<string>()
  for (const w of wires) {
    used.add(w.fromComponentId)
    used.add(w.toComponentId)
  }
  const next = components.filter((c) => c.type !== JUNCTION_TYPE || used.has(c.id))
  return next.length === components.length ? components : next
}
