import type { ComponentDefinition } from "@/types/simulator"
import { HcSr04Renderer } from "@/components/simulator/components/hc-sr04/renderer"
import { simulateHcSr04 } from "@/lib/simulator/engine/component-simulation"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"

// Source SVG is 45×25; pin order follows the visible VCC/TRIG/ECHO/GND header.
export const hcSr04Definition: ComponentDefinition = {
  type: "hc-sr04",
  name: "HC-SR04 Ultrasonic Sensor",
  category: "input",
  width: 108,
  height: 60,
  pinTemplates: [
    { name: "vcc", type: "power", x: 45.59, y: 59.5 },
    { name: "trig", type: "digital", x: 51.68, y: 59.5 },
    { name: "echo", type: "digital", x: 57.78, y: 59.5 },
    { name: "gnd", type: "ground", x: 63.88, y: 59.5 },
  ],
  defaultMetadata: { distanceCm: 100 },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateHcSr04,
  Renderer: HcSr04Renderer,
}
