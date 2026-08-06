import type { ComponentDefinition } from "@/types/simulator"
import { ServoRenderer } from "@/components/simulator/components/servo/renderer"
import { simulateServo } from "@/lib/simulator/engine/component-simulation"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"

export const servoDefinition: ComponentDefinition = {
  type: "servo",
  name: "Micro Servo (SG90)",
  category: "output",
  width: 96,
  height: 92,
  pinTemplates: [
    { name: "gnd", type: "ground", x: 32, y: 92 },
    { name: "vcc", type: "power", x: 48, y: 92 },
    { name: "signal", type: "digital", x: 64, y: 92 },
  ],
  defaultMetadata: {},
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateServo,
  Renderer: ServoRenderer,
}
