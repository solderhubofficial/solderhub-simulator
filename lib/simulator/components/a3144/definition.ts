import type { ComponentDefinition } from "@/types/simulator"
import { A3144Renderer } from "@/components/simulator/components/a3144/renderer"
import { simulateA3144 } from "@/lib/simulator/engine/component-simulation"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"

/**
 * Bare TO-92 A3144 unipolar Hall-effect switch.
 * Viewed from the marked/flat face, the common pin order is VCC, GND, OUT.
 * The open-collector output needs an external pull-up (or a board's internal
 * pull-up); do not treat OUT as a push-pull logic output.
 */
export const a3144Definition: ComponentDefinition = {
  type: "a3144",
  name: "A3144 Hall Effect Sensor",
  category: "input",
  width: 84,
  height: 92,
  pinTemplates: [
    { name: "vcc", type: "power", x: 24, y: 88 },
    { name: "gnd", type: "ground", x: 42, y: 88 },
    { name: "out", type: "digital", x: 60, y: 88 },
  ],
  defaultMetadata: {
    magnetDetected: false,
    supplyMinVolts: 4.5,
    outputMode: "open-collector",
  },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateA3144,
  Renderer: A3144Renderer,
}
