import type { ComponentDefinition } from "@/types/simulator"
import { HcSr04Renderer } from "@/components/simulator/components/hc-sr04/renderer"
import { simulateHcSr04 } from "@/lib/simulator/engine/component-simulation"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"

export const hcSr04Definition: ComponentDefinition = {
  type: "hc-sr04",
  name: "HC-SR04 Ultrasonic Sensor",
  category: "input",
  width: 88,
  height: 58,
  pinTemplates: [
    { name: "vcc", type: "power", x: 14, y: 56 },
    { name: "trig", type: "digital", x: 34, y: 56 },
    { name: "echo", type: "digital", x: 54, y: 56 },
    { name: "gnd", type: "ground", x: 74, y: 56 },
  ],
  defaultMetadata: { distanceCm: 100 },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateHcSr04,
  Renderer: HcSr04Renderer,
}
