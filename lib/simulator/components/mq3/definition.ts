import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulatePassive } from "@/lib/simulator/engine/component-simulation"
import { Mq3Renderer } from "@/components/simulator/components/mq3/renderer"

export const mq3Definition: ComponentDefinition = {
  type: "mq3",
  name: "MQ-3 Alcohol Sensor",
  category: "input",
  width: 120,
  height: 170,
  pinTemplates: [
    { name: "VCC", type: "power", x: 26, y: 168 },
    { name: "GND", type: "ground", x: 47, y: 168 },
    { name: "DO", type: "digital", x: 73, y: 168 },
    { name: "AO", type: "analog", x: 94, y: 168 },
  ],
  defaultMetadata: { analogValue: 320, detected: false },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulatePassive,
  Renderer: Mq3Renderer,
}
