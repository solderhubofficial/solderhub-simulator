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
  // Keep the human-facing convention uppercase; matching below is case-insensitive.
  mpu6050: ["vcc", "gnd", "SCL", "SDA"],
  rc522: ["SDA/SS", "SCK", "MOSI", "MISO", "GND", "RST", "3.3V"],
}

const normalizePinName = (name: string) => name.trim().toLocaleLowerCase("en-US")

/**
 * Lightweight wiring heuristics, not a SPICE/electrical-rule-checking engine.
 * A pin is considered wired when a wire endpoint references a real pin on a
 * component that currently exists on the canvas.
 */
export function inspectCircuit(
  components: PlacedComponent[],
  wires: Wire[],
  getDefinition: (type: string) => ComponentDefinition | undefined,
  getPins: (component: PlacedComponent) => { id: string; name: string }[],
): CircuitCheck[] {
  const checks: CircuitCheck[] = []
  const componentById = new Map<string, PlacedComponent>(components.map((component) => [component.id, component] as const))
  const pinsByComponent = new Map<string, { id: string; name: string }[]>(
    components.map((component) => [component.id, getPins(component)] as const),
  )
  const boardComponents = components.filter((component) => getDefinition(component.type)?.category === "board")
  const wiredPins = new Set<string>()
  const wiredComponents = new Set<string>()

  // Ignore stale endpoints for connectivity purposes, but tell the user when a
  // saved/imported wire references a missing component or a pin that no longer exists.
  for (const wire of wires) {
    for (const endpoint of [
      { side: "from", componentId: wire.fromComponentId, pinId: wire.fromPinId },
      { side: "to", componentId: wire.toComponentId, pinId: wire.toPinId },
    ] as const) {
      const component = componentById.get(endpoint.componentId)
      if (!component) {
        checks.push({
          id: `invalid-wire-${wire.id}-${endpoint.side}`,
          severity: "warning",
          title: "A wire endpoint is disconnected from the canvas",
          detail: "This wire refers to a component that is no longer on the canvas. Delete or reconnect the wire.",
        })
        continue
      }

      const pin = (pinsByComponent.get(component.id) ?? []).find((candidate) => candidate.id === endpoint.pinId)
      if (!pin) {
        checks.push({
          id: `invalid-wire-${wire.id}-${endpoint.side}`,
          severity: "warning",
          title: `${component.name}: a wire endpoint needs repair`,
          detail: "This wire refers to a pin that does not exist on this component. Reconnect it to a visible pin.",
          componentId: component.id,
        })
        continue
      }

      wiredPins.add(`${component.id}::${pin.id}`)
      wiredComponents.add(component.id)
    }
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
        detail: "This part is on the canvas but has no valid wire endpoints. Check its pins and connections.",
        componentId: component.id,
      })
      continue
    }

    const requiredPins = REQUIRED_PINS[component.type]
    if (!requiredPins) continue

    const pins = pinsByComponent.get(component.id) ?? []
    const missingTemplatePins = requiredPins.filter(
      (name) => !pins.some((candidate) => normalizePinName(candidate.name) === normalizePinName(name)),
    )
    if (missingTemplatePins.length > 0) {
      checks.push({
        id: `pin-check-coverage-${component.id}`,
        severity: "info",
        title: `${component.name}: pin checks are incomplete`,
        detail: `Circuit Coach could not match these expected pin labels to the component definition: ${missingTemplatePins.join(", ")}. This is a checker coverage limitation, not proof of a wiring fault.`,
        componentId: component.id,
      })
    }

    const missingPins = requiredPins.filter((name) => {
      const pin = pins.find((candidate) => normalizePinName(candidate.name) === normalizePinName(name))
      return pin ? !wiredPins.has(`${component.id}::${pin.id}`) : false
    })

    if (missingPins.length > 0) {
      checks.push({
        id: `missing-pins-${component.id}`,
        severity: "warning",
        title: `${component.name}: check pin connections`,
        detail: `No wire endpoint found for: ${missingPins.join(", ")}. Verify the module pinout and power/data wiring.`,
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
