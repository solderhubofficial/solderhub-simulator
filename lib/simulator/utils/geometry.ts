import { GRID_SIZE } from "@/lib/simulator/constants"
import type { ComponentPin, PlacedComponent } from "@/types/simulator"

/** Snap a coordinate to the nearest grid line */
export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

/** Rotate a point around origin by degrees (0|90|180|270) */
export function rotatePoint(
  x: number,
  y: number,
  rotation: 0 | 90 | 180 | 270
): { x: number; y: number } {
  switch (rotation) {
    case 90:
      return { x: -y, y: x }
    case 180:
      return { x: -x, y: -y }
    case 270:
      return { x: y, y: -x }
    default:
      return { x, y }
  }
}

/** Absolute canvas position of a pin on a placed component */
export function getPinWorldPosition(
  component: PlacedComponent,
  pin: ComponentPin
): { x: number; y: number } {
  const rotated = rotatePoint(pin.x, pin.y, component.rotation)
  return {
    x: component.x + rotated.x,
    y: component.y + rotated.y,
  }
}

/** Convert screen coordinates to canvas world coordinates */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: { x: number; y: number; zoom: number },
  canvasRect: DOMRect
): { x: number; y: number } {
  const localX = screenX - canvasRect.left
  const localY = screenY - canvasRect.top
  return {
    x: (localX - viewport.x) / viewport.zoom,
    y: (localY - viewport.y) / viewport.zoom,
  }
}

/**
 * Build an SVG path for a wire between two points as straight, auto-routed
 * orthogonal segments (horizontal → vertical → horizontal) instead of a
 * curved bezier — closer to how a real jumper/trace would be drawn on a
 * schematic, and keeps wires from overlapping component bodies diagonally.
 */
export function buildWirePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  if (y1 === y2 || x1 === x2) {
    // Already a straight shot — no bend needed.
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }
  const midX = x1 + (x2 - x1) / 2
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
}
