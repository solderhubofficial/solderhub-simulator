import type { ComponentDefinition, ComponentPin, PinType, PinVoltage, PlacedComponent, Wire } from "@/types/simulator"
import { V_HIGH, V_LOW } from "@/lib/simulator/constants"

/** Union-Find for electrical net grouping */
class UnionFind {
  private parent: Map<string, string> = new Map()

  find(key: string): string {
    if (!this.parent.has(key)) this.parent.set(key, key)
    const p = this.parent.get(key)!
    if (p !== key) {
      const root = this.find(p)
      this.parent.set(key, root)
      return root
    }
    return p
  }

  union(a: string, b: string): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

function pinKey(componentId: string, pinId: string): string {
  return `${componentId}::${pinId}`
}

/** Collect all electrical connections from wires and internal component links */
function buildConnections(
  components: PlacedComponent[],
  wires: Wire[],
  getDefinition: (type: string) => ComponentDefinition | undefined,
  getPins: (component: PlacedComponent) => ComponentPin[],
  relayEnergized: Map<string, boolean> | null = null
): UnionFind {
  const uf = new UnionFind()

  for (const wire of wires) {
    uf.union(
      pinKey(wire.fromComponentId, wire.fromPinId),
      pinKey(wire.toComponentId, wire.toPinId)
    )
  }

  for (const component of components) {
    const def = getDefinition(component.type)
    if (!def) continue
    const pins = getPins(component)
    for (const [a, b] of def.getInternalConnections(component, pins)) {
      uf.union(pinKey(component.id, a), pinKey(component.id, b))
    }

    // Relay contact switching based on coil state from prior pass
    if (component.type === "relay" && relayEnergized) {
      const energized = relayEnergized.get(component.id) ?? false
      const com = pins.find((p) => p.name === "COM")
      const no = pins.find((p) => p.name === "NO")
      const nc = pins.find((p) => p.name === "NC")
      if (com) {
        if (energized && no) uf.union(pinKey(component.id, com.id), pinKey(component.id, no.id))
        if (!energized && nc) uf.union(pinKey(component.id, com.id), pinKey(component.id, nc.id))
      }
    }
  }

  return uf
}

/** Drive nets from power sources, Arduino outputs, and potentiometers */
function driveNets(
  components: PlacedComponent[],
  getDefinition: (type: string) => ComponentDefinition | undefined,
  getPins: (component: PlacedComponent) => ComponentPin[],
  uf: UnionFind,
  isRunning: boolean
): Record<string, PinVoltage> {
  const netVoltages = new Map<string, PinVoltage>()
  const pinVoltages: Record<string, PinVoltage> = {}

  if (!isRunning) return pinVoltages

  // Collect drivers: pinKey -> voltage
  const drivers: { key: string; voltage: number }[] = []

  for (const component of components) {
    const def = getDefinition(component.type)
    if (!def) continue
    const pins = getPins(component)

    if (component.type === "arduino-uno") {
      const pinModes = (component.metadata.pinModes ?? {}) as Record<string, string>
      const pinValues = (component.metadata.pinValues ?? {}) as Record<string, number>

      for (const pin of pins) {
        if (pin.type === "power") {
          drivers.push({ key: pinKey(component.id, pin.id), voltage: V_HIGH })
        } else if (pin.type === "ground") {
          drivers.push({ key: pinKey(component.id, pin.id), voltage: V_LOW })
        } else if (pinModes[pin.name] === "OUTPUT") {
          const val = pinValues[pin.name] ?? 0
          drivers.push({
            key: pinKey(component.id, pin.id),
            voltage: val >= 1 ? V_HIGH : V_LOW,
          })
        }
      }
    }

    if (component.type === "potentiometer") {
      const position = typeof component.metadata.position === "number"
        ? Math.min(1, Math.max(0, component.metadata.position))
        : 0.5
      const gndPin = pins.find((p) => p.name === "gnd")
      const vccPin = pins.find((p) => p.name === "vcc")
      const wiperPin = pins.find((p) => p.name === "wiper")
      if (wiperPin) {
        // Wiper driven after net merge — handled in second pass
        void gndPin
        void vccPin
        void position
      }
    }

    if (component.type === "push-button" && component.metadata.pressed === true) {
      const pinA = pins.find((p) => p.name === "pin1")
      const pinB = pins.find((p) => p.name === "pin2")
      if (pinA && pinB) {
        // Internal connection already handled; optionally pull HIGH if one side is HIGH
        const keyA = pinKey(component.id, pinA.id)
        const keyB = pinKey(component.id, pinB.id)
        drivers.push({ key: keyA, voltage: V_HIGH })
        drivers.push({ key: keyB, voltage: V_HIGH })
      }
    }
  }

  // Assign driver voltages to nets (power wins over ground conflicts → use average for v1)
  for (const { key, voltage } of drivers) {
    const net = uf.find(key)
    const existing = netVoltages.get(net)
    if (existing === null || existing === undefined) {
      netVoltages.set(net, voltage)
    } else if (existing !== voltage) {
      // Conflict: if both HIGH and LOW on same net, mark as LOW (short protection)
      netVoltages.set(net, V_LOW)
    }
  }

  // Potentiometer wiper drive (needs net voltages for gnd/vcc)
  for (const component of components) {
    if (component.type !== "potentiometer") continue
    const pins = getPins(component)
    const gndPin = pins.find((p) => p.name === "gnd")
    const vccPin = pins.find((p) => p.name === "vcc")
    const wiperPin = pins.find((p) => p.name === "wiper")
    if (!gndPin || !vccPin || !wiperPin) continue

    const gndNet = uf.find(pinKey(component.id, gndPin.id))
    const vccNet = uf.find(pinKey(component.id, vccPin.id))
    const gndV = netVoltages.get(gndNet) ?? V_LOW
    const vccV = netVoltages.get(vccNet) ?? V_HIGH
    const position = typeof component.metadata.position === "number"
      ? Math.min(1, Math.max(0, component.metadata.position))
      : 0.5

    if (gndV !== null && vccV !== null) {
      const wiperV = gndV + (vccV - gndV) * position
      const wiperNet = uf.find(pinKey(component.id, wiperPin.id))
      netVoltages.set(wiperNet, wiperV)
    }
  }

  // Propagate net voltages to all pins
  for (const component of components) {
    const pins = getPins(component)
    for (const pin of pins) {
      const key = pinKey(component.id, pin.id)
      const net = uf.find(key)
      pinVoltages[key] = netVoltages.get(net) ?? null
    }
  }

  // Remap to pinId keys for component simulation
  const result: Record<string, PinVoltage> = {}
  for (const component of components) {
    const pins = getPins(component)
    for (const pin of pins) {
      const key = pinKey(component.id, pin.id)
      result[pin.id] = pinVoltages[key] ?? null
    }
  }

  return result
}

function computeResults(
  components: PlacedComponent[],
  wires: Wire[],
  getDefinition: (type: string) => ComponentDefinition | undefined,
  getPins: (component: PlacedComponent) => ComponentPin[],
  isRunning: boolean,
  relayEnergized: Map<string, boolean> | null
): {
  results: Record<string, import("@/types/simulator").ComponentSimulationResult>
  pinVoltages: Record<string, PinVoltage>
} {
  const uf = buildConnections(components, wires, getDefinition, getPins, relayEnergized)
  const pinVoltages = driveNets(components, getDefinition, getPins, uf, isRunning)

  const results: Record<string, import("@/types/simulator").ComponentSimulationResult> = {}

  for (const component of components) {
    const def = getDefinition(component.type)
    if (!def) continue
    const pins = getPins(component)
    const localVoltages: Record<string, PinVoltage> = {}
    for (const pin of pins) {
      localVoltages[pin.id] = pinVoltages[pin.id] ?? null
    }
    results[component.id] = def.simulate(component, pins, localVoltages)
  }

  return { results, pinVoltages }
}

/** Run one simulation tick across all components (two-pass for relay contacts) */
export function runSimulationTick(
  components: PlacedComponent[],
  wires: Wire[],
  getDefinition: (type: string) => ComponentDefinition | undefined,
  getPins: (component: PlacedComponent) => ComponentPin[],
  isRunning: boolean
): Record<string, import("@/types/simulator").ComponentSimulationResult> {
  // Pass 1: determine relay coil states without contact connections
  const pass1 = computeResults(components, wires, getDefinition, getPins, isRunning, null)
  const relayEnergized = new Map<string, boolean>()
  for (const component of components) {
    if (component.type === "relay") {
      relayEnergized.set(
        component.id,
        pass1.results[component.id]?.flags.isEnergized === true
      )
    }
  }

  // Pass 2: recompute with relay contact switching
  const pass2 = computeResults(
    components,
    wires,
    getDefinition,
    getPins,
    isRunning,
    relayEnergized
  )
  return pass2.results
}

/** Validate whether two pins may be connected */
export function canConnectPins(
  fromDef: ComponentDefinition,
  fromPin: ComponentPin,
  toDef: ComponentDefinition,
  toPin: ComponentPin,
  existingWires: Wire[],
  fromComponentId: string,
  toComponentId: string
): boolean {
  if (fromComponentId === toComponentId && fromPin.id === toPin.id) return false

  if (!fromDef.canConnectPins(fromPin.type, toPin.type)) return false
  if (!toDef.canConnectPins(toPin.type, fromPin.type)) return false

  // Prevent duplicate wire between same two pins
  const duplicate = existingWires.some(
    (w) =>
      (w.fromComponentId === fromComponentId &&
        w.fromPinId === fromPin.id &&
        w.toComponentId === toComponentId &&
        w.toPinId === toPin.id) ||
      (w.fromComponentId === toComponentId &&
        w.fromPinId === toPin.id &&
        w.toComponentId === fromComponentId &&
        w.toPinId === fromPin.id)
  )
  if (duplicate) return false

  return true
}

/** Check if pin type pairing is generally valid */
export function isValidPinPair(a: PinType, b: PinType): boolean {
  if (a === "power" && b === "ground") return false
  if (a === "ground" && b === "power") return false
  return true
}
