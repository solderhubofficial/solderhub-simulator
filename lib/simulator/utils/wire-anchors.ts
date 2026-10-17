import type { ComponentPin, PlacedComponent } from "@/types/simulator"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { getComponentBounds, getPinWorldPosition } from "@/lib/simulator/utils/geometry"
import { pinExitDirection, stubEnd, type Point, type RouteEndpoint } from "@/lib/simulator/utils/wire-routing"

/** A pin's world position plus the way a wire should leave it. */
export function pinAnchor(component: PlacedComponent, pin: ComponentPin): RouteEndpoint {
  const pos = getPinWorldPosition(component, pin)
  const def = getComponentDefinition(component.type)
  const bounds = def ? getComponentBounds(component, def.width, def.height) : null
  return { x: pos.x, y: pos.y, dir: bounds ? pinExitDirection(pos, bounds) : null }
}

/** Where a wire first heads after leaving the pin: the end of its lead-out, or the pin itself. */
export function leadOutPoint(anchor: RouteEndpoint): Point {
  return anchor.dir ? stubEnd(anchor) : { x: anchor.x, y: anchor.y }
}
