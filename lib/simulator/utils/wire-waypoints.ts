import type { Wire } from "@/types/simulator"
import type { Point } from "@/lib/simulator/utils/wire-routing"

const NEAR = 0.5

/**
 * When a part moves, the bend points of custom wires attached to it follow: fully if both ends
 * sit on that part, otherwise in proportion to how close each bend is to the moving end, so the
 * wire stretches smoothly instead of tearing away from its pin.
 */
export function shiftWireBends(wire: Wire, componentId: string, dx: number, dy: number): Wire {
  const route = wire.route
  if (!route || route.style !== "custom" || !route.points || route.points.length === 0) return wire
  const fromHit = wire.fromComponentId === componentId
  const toHit = wire.toComponentId === componentId
  if (!fromHit && !toHit) return wire
  const n = route.points.length
  const points = route.points.map((p, i) => {
    const t = (i + 1) / (n + 1)
    const weight = fromHit && toHit ? 1 : fromHit ? 1 - t : t
    return { x: p.x + dx * weight, y: p.y + dy * weight }
  })
  return { ...wire, route: { ...route, points } }
}

/**
 * Finishing a wire in right-angle mode: if the last bend doesn't line up with where the wire
 * must arrive, add one corner so the final run stays square.
 */
export function closeOrthogonal(points: Point[], start: Point, target: Point): Point[] {
  if (points.length === 0) return points
  const last = points[points.length - 1]
  if (Math.abs(last.x - target.x) < NEAR || Math.abs(last.y - target.y) < NEAR) return points
  const before = points.length >= 2 ? points[points.length - 2] : start
  const lastWasHorizontal = Math.abs(last.x - before.x) >= Math.abs(last.y - before.y)
  const corner = lastWasHorizontal ? { x: last.x, y: target.y } : { x: target.x, y: last.y }
  return [...points, corner]
}

/** Inserts a bend so it sits between chain neighbours; returns the new list and the new index. */
export function insertBend(points: Point[], index: number, at: Point): Point[] {
  const clamped = Math.max(0, Math.min(points.length, index))
  return [...points.slice(0, clamped), { x: at.x, y: at.y }, ...points.slice(clamped)]
}

export function removeBend(points: Point[], index: number): Point[] {
  return points.filter((_, i) => i !== index)
}
