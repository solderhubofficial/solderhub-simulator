import type { PlacedComponent, Wire } from "@/types/simulator"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import { pinAnchor } from "@/lib/simulator/utils/wire-anchors"
import { orthogonalBends, stubEnd, type Point, type RouteEndpoint } from "@/lib/simulator/utils/wire-routing"

function endpoint(components: PlacedComponent[], componentId: string, pinId: string): RouteEndpoint | null {
  const component = components.find((c) => c.id === componentId)
  const def = component ? getComponentDefinition(component.type) : undefined
  if (!component || !def) return null
  const pin = instantiatePins(component.id, def.pinTemplates).find((p) => p.id === pinId)
  return pin ? pinAnchor(component, pin) : null
}

/**
 * After a part moves, the bends of a right-angle custom wire attached to it can end up on a slant.
 * This adds the corners needed to keep every run horizontal or vertical. Wires drawn at 45° or
 * freely, and automatically routed wires (which are always square), are left alone.
 */
export function squareUpWire(wire: Wire, components: PlacedComponent[]): Wire {
  const route = wire.route
  if (!route || route.style !== "custom" || route.angle || !route.points || route.points.length === 0) return wire
  const from = endpoint(components, wire.fromComponentId, wire.fromPinId)
  const to = endpoint(components, wire.toComponentId, wire.toPinId)
  if (!from || !to) return wire
  const points = orthogonalBends(from, to, route.points)
  if (points.length === 0) return { ...wire, route: { style: "straight" } }
  return { ...wire, route: { ...route, points } }
}

const TOL = 0.75

/** Moves the bend next to a pin's lead-out so the run between them keeps its direction. */
function follow(bend: Point, ref: Point, dx: number, dy: number): Point {
  if (Math.abs(bend.y - ref.y) < TOL) return { x: bend.x, y: bend.y + dy }
  if (Math.abs(bend.x - ref.x) < TOL) return { x: bend.x + dx, y: bend.y }
  return bend
}

/**
 * Updates a custom wire when one of its parts moves by (dx, dy). For right-angle wires only the bend
 * beside the moved pin follows it, along the axis that keeps the neighbouring runs horizontal or vertical,
 * so the rest of the route stays put and nothing turns diagonal. Angled wires fall back to `fallback`.
 */
export function moveWireWithPart(
  wire: Wire,
  movedId: string,
  dx: number,
  dy: number,
  before: PlacedComponent[],
  after: PlacedComponent[],
  fallback: (w: Wire) => Wire
): Wire {
  const route = wire.route
  const touches = wire.fromComponentId === movedId || wire.toComponentId === movedId
  if (!touches) return wire
  if (!route || route.style !== "custom" || route.angle || !route.points || route.points.length === 0) return fallback(wire)
  if (wire.fromComponentId === movedId && wire.toComponentId === movedId) return fallback(wire)

  const points = route.points.map((p) => ({ ...p }))
  if (wire.fromComponentId === movedId) {
    const old = endpoint(before, wire.fromComponentId, wire.fromPinId)
    if (old) points[0] = follow(points[0], stubEnd(old), dx, dy)
  } else {
    const old = endpoint(before, wire.toComponentId, wire.toPinId)
    if (old) points[points.length - 1] = follow(points[points.length - 1], stubEnd(old), dx, dy)
  }
  return squareUpWire({ ...wire, route: { ...route, points } }, after)
}
