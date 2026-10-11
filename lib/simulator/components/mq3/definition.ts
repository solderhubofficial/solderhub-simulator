import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulatePassive } from "@/lib/simulator/engine/component-simulation"
import { Mq3Renderer } from "@/components/simulator/components/mq3/renderer"

export const mq3Definition: ComponentDefinition = {
  type: "mq3",
  name: "MQ-3 Alcohol Sensor",
  category: "input",
  width: 100,
  height: 100,
  pinTemplates: [
    { name: "VCC", type: "power", x: 18, y: 98 },
    { name: "GND", type: "ground", x: 39, y: 98 },
    { name: "DO", type: "digital", x: 61, y: 98 },
    { name: "AO", type: "analog", x: 82, y: 98 },
  ],
  defaultMetadata: { analogValue: 320, detected: false },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulatePassive,
  Renderer: Mq3Renderer,
}
