import type { PlacedComponent, Wire } from "@/types/simulator"

/**
 * Curated, version-controlled canvas projects.
 *
 * Keep these records compact: component artwork and pin definitions are loaded
 * from the simulator registry, so a saved circuit only needs instance data and
 * wire endpoints. This is intentionally separate from firmware demo projects.
 */
export interface SavedCircuitDefinition {
  id: string
  title: string
  description: string
  version: 1
  components: PlacedComponent[]
  wires: Wire[]
}

const unoLedStarter: SavedCircuitDefinition = {
  id: "uno-led-starter",
  title: "Arduino Uno LED Starter",
  description: "A prebuilt visual circuit with an Arduino Uno, current-limiting resistor, and LED. This is a canvas project, not a firmware-execution demo.",
  version: 1,
  components: [
    {
      id: "uno",
      type: "arduino-uno",
      name: "Arduino Uno",
      x: 170,
      y: 150,
      rotation: 0,
      metadata: { pinModes: { D13: "OUTPUT" }, pinValues: { D13: 1 } },
    },
    {
      id: "r1",
      type: "resistor",
      name: "220 Ω Resistor",
      x: 700,
      y: 260,
      rotation: 0,
      metadata: { resistance: 220, unit: "Ω" },
    },
    {
      id: "led1",
      type: "led",
      name: "Red LED",
      x: 900,
      y: 250,
      rotation: 0,
      metadata: { color: "red" },
    },
  ],
  wires: [
    {
      id: "wire-d13-r1",
      fromComponentId: "uno",
      fromPinId: "uno_D13",
      toComponentId: "r1",
      toPinId: "r1_A",
      color: "#e34b4b",
    },
    {
      id: "wire-r1-led",
      fromComponentId: "r1",
      fromPinId: "r1_B",
      toComponentId: "led1",
      toPinId: "led1_anode",
      color: "#e34b4b",
    },
    {
      id: "wire-led-gnd",
      fromComponentId: "led1",
      fromPinId: "led1_cathode",
      toComponentId: "uno",
      toPinId: "uno_GND1",
      color: "#444b55",
    },
  ],
}

const SAVED_CIRCUITS: Record<string, SavedCircuitDefinition> = {
  "uno-led-starter": unoLedStarter,
}

export function getSavedCircuit(id: string): SavedCircuitDefinition | undefined {
  return SAVED_CIRCUITS[id]
}

export function getSavedCircuitIds(): string[] {
  return Object.keys(SAVED_CIRCUITS)
}
