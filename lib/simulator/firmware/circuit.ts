import type { PlacedComponent, Viewport, Wire, WireRoute } from "@/types/simulator"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { getComponentBounds } from "@/lib/simulator/utils/geometry"
import { generateId } from "@/lib/simulator/utils/id"
import { MAX_ZOOM, MIN_ZOOM } from "@/lib/simulator/constants"

/**
 * A pre-built circuit that ships with a project: which parts to place, where,
 * and how they are wired. It is declarative and uses stable string keys
 * (`"uno"`, `"led"`, ...) instead of runtime ids, so the same definition can
 * be read, reviewed and tested as plain data.
 *
 * `instantiateCircuit` turns it into real PlacedComponent / Wire objects with
 * fresh ids when the project is loaded.
 */
export interface CircuitPart {
  /** Stable key used by wires to refer to this part. Unique within a circuit. */
  key: string
  /** Registered component type, e.g. "arduino-uno", "led", "resistor". */
  type: string
  x: number
  y: number
  rotation?: 0 | 90 | 180 | 270
  /** Merged over the component's defaultMetadata. */
  metadata?: Record<string, unknown>
}

export interface CircuitWire {
  /** [part key, pin name], e.g. ["uno", "D13"]. */
  from: [string, string]
  to: [string, string]
  color?: string
  route?: WireRoute
}

export interface ProjectCircuit {
  /** Key of the part that runs the firmware (the Arduino board). */
  board: string
  parts: CircuitPart[]
  wires: CircuitWire[]
}

export interface InstantiatedCircuit {
  components: PlacedComponent[]
  wires: Wire[]
  /** Runtime id of the board component that should receive the firmware. */
  boardId: string
}

/**
 * Builds placed components and wires from a ProjectCircuit. Throws a clear
 * error if a part type, a wire endpoint or a pin name doesn't exist, so a
 * typo in a project definition fails loudly in tests rather than rendering
 * a silently broken circuit.
 */
export function instantiateCircuit(circuit: ProjectCircuit): InstantiatedCircuit {
  const idByKey = new Map<string, string>()
  const pinNamesByKey = new Map<string, Set<string>>()
  const components: PlacedComponent[] = []

  for (const part of circuit.parts) {
    if (idByKey.has(part.key)) throw new Error(`Duplicate circuit part key "${part.key}".`)
    const def = getComponentDefinition(part.type)
    if (!def) throw new Error(`Circuit part "${part.key}" uses unknown component type "${part.type}".`)

    const id = generateId("comp")
    idByKey.set(part.key, id)
    pinNamesByKey.set(part.key, new Set(def.pinTemplates.map((pin) => pin.name)))
    components.push({
      id,
      type: def.type,
      name: def.name,
      x: part.x,
      y: part.y,
      rotation: part.rotation ?? 0,
      metadata: { ...def.defaultMetadata, ...(part.metadata ?? {}) },
    })
  }

  const resolveEndpoint = ([key, pin]: [string, string]) => {
    const componentId = idByKey.get(key)
    if (!componentId) throw new Error(`Circuit wire refers to unknown part "${key}".`)
    if (!pinNamesByKey.get(key)!.has(pin)) {
      throw new Error(`Part "${key}" has no pin named "${pin}".`)
    }
    // Pin ids are `${componentId}_${pinName}` -- see instantiatePins().
    return { componentId, pinId: `${componentId}_${pin}` }
  }

  const wires: Wire[] = circuit.wires.map((wire) => {
    const from = resolveEndpoint(wire.from)
    const to = resolveEndpoint(wire.to)
    return {
      id: generateId("wire"),
      fromComponentId: from.componentId,
      fromPinId: from.pinId,
      toComponentId: to.componentId,
      toPinId: to.pinId,
      ...(wire.color ? { color: wire.color } : {}),
      ...(wire.route ? { route: wire.route } : {}),
    }
  })

  const boardId = idByKey.get(circuit.board)
  if (!boardId) throw new Error(`Circuit board key "${circuit.board}" doesn't match any part.`)

  return { components, wires, boardId }
}

/** Bounding box of every placed part, or null for an empty canvas. */
export function circuitBounds(components: PlacedComponent[]) {
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const component of components) {
    const def = getComponentDefinition(component.type)
    if (!def) continue
    const bounds = getComponentBounds(component, def.width, def.height)
    left = Math.min(left, bounds.left)
    top = Math.min(top, bounds.top)
    right = Math.max(right, bounds.right)
    bottom = Math.max(bottom, bounds.bottom)
  }
  return Number.isFinite(left) ? { left, top, right, bottom } : null
}

export interface FitPadding {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Viewport that centres the circuit inside a container of the given size
 * (screen px) with some breathing room. `padding` can be a single number or
 * per-side insets (e.g. extra room on the right for an overlay panel). Never
 * zooms in past 1:1 -- a tiny circuit should look like itself, not blown up.
 */
export function fitViewport(
  components: PlacedComponent[],
  containerWidth: number,
  containerHeight: number,
  padding: number | FitPadding = 40,
): Viewport | null {
  const bounds = circuitBounds(components)
  if (!bounds || containerWidth <= 0 || containerHeight <= 0) return null

  const pad: FitPadding =
    typeof padding === "number" ? { top: padding, right: padding, bottom: padding, left: padding } : padding

  const width = bounds.right - bounds.left
  const height = bounds.bottom - bounds.top
  const availableWidth = Math.max(containerWidth - pad.left - pad.right, 1)
  const availableHeight = Math.max(containerHeight - pad.top - pad.bottom, 1)
  const zoom = Math.min(Math.max(Math.min(availableWidth / width, availableHeight / height, 1), MIN_ZOOM), MAX_ZOOM)

  return {
    zoom,
    x: pad.left + (availableWidth - width * zoom) / 2 - bounds.left * zoom,
    y: pad.top + (availableHeight - height * zoom) / 2 - bounds.top * zoom,
  }
}
