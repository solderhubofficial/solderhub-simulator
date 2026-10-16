import type { ComponentDefinition, PlacedComponent, Wire } from "@/types/simulator"

export type CircuitCheckSeverity = "error" | "warning" | "info"

export interface CircuitCheck {
  id: string
  severity: CircuitCheckSeverity
  title: string
  detail: string
  componentId?: string
}

const REQUIRED_PINS: Record<string, string[]> = {
  led: ["anode", "cathode"],
  dht11: ["GND", "DATA", "VCC"],
  dht22: ["GND", "DATA", "VCC"],
  ds18b20: ["GND", "DQ", "VDD"],
  "hc-sr04": ["vcc", "trig", "echo", "gnd"],
  servo: ["gnd", "vcc", "signal"],
  "oled-13": ["VCC", "GND", "SCL", "SDA"],
  mpu6050: ["vcc", "gnd", "scl", "sda"],
  rc522: ["SDA/SS", "SCK", "MOSI", "MISO", "GND", "RST", "3.3V"],
}

/**
 * Lightweight wiring heuristics, not a SPICE/electrical-rule-checking engine.
 * A pin is considered wired when a saved wire endpoint references that pin.
 */
export function inspectCircuit(
  components: PlacedComponent[],
  wires: Wire[],
  getDefinition: (type: string) => ComponentDefinition | undefined,
  getPins: (component: PlacedComponent) => { id: string; name: string }[],
): CircuitCheck[] {
  const checks: CircuitCheck[] = []
  const boardComponents = components.filter((component) => getDefinition(component.type)?.category === "board")
  const wiredPins = new Set<string>()
  const wiredComponents = new Set<string>()

  for (const wire of wires) {
    wiredPins.add(`${wire.fromComponentId}::${wire.fromPinId}`)
    wiredPins.add(`${wire.toComponentId}::${wire.toPinId}`)
    wiredComponents.add(wire.fromComponentId)
    wiredComponents.add(wire.toComponentId)
  }

  if (components.length === 0) {
    checks.push({
      id: "empty-canvas",
      severity: "info",
      title: "Start with a board or a saved circuit",
      detail: "Add a microcontroller from Components, or open a project from Explore to get started.",
    })
    return checks
  }

  if (boardComponents.length === 0) {
    checks.push({
      id: "missing-board",
      severity: "error",
      title: "No microcontroller board found",
      detail: "Add a supported board before expecting a board-based circuit to run.",
    })
  }

  if (wires.length === 0) {
    checks.push({
      id: "no-wires",
      severity: "warning",
      title: "No electrical connections yet",
      detail: "Connect component pins to begin building a circuit. Visual proximity alone does not create a connection.",
    })
  }

  for (const component of components) {
    const definition = getDefinition(component.type)
    if (!definition || definition.category === "board" || component.type === "breadboard") continue

    if (!wiredComponents.has(component.id)) {
      checks.push({
        id: `unwired-component-${component.id}`,
        severity: "warning",
        title: `${component.name} has no wires`,
        detail: "This part is on the canvas but has no explicit wire endpoints. Check its pins and connections.",
        componentId: component.id,
      })
      continue
    }

    const requiredPins = REQUIRED_PINS[component.type]
    if (!requiredPins) continue
    const pins = getPins(component)
    const missing = requiredPins.filter((name) => {
      const pin = pins.find((candidate) => candidate.name === name)
      return pin ? !wiredPins.has(`${component.id}::${pin.id}`) : false
    })

    if (missing.length > 0) {
      checks.push({
        id: `missing-pins-${component.id}`,
        severity: "warning",
        title: `${component.name}: check pin connections`,
        detail: `No wire endpoint found for: ${missing.join(", ")}. Verify the module pinout and power/data wiring.`,
        componentId: component.id,
      })
    }
  }

  if (checks.length === 0) {
    checks.push({
      id: "basic-wiring-covered",
      severity: "info",
      title: "Basic wiring checks passed",
      detail: "No obvious missing-board or disconnected-part issues were found. This is a wiring heuristic, not a full electrical or firmware validation.",
    })
  }

  return checks
}
