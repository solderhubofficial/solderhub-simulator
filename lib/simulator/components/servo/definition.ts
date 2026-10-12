import type { ComponentDefinition } from "@/types/simulator"
import { ServoRenderer } from "@/components/simulator/components/servo/renderer"
import { simulateServo } from "@/lib/simulator/engine/component-simulation"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"

// Source-SVG connector order: brown/GND, red/VCC, orange/SIGNAL.
export const servoDefinition: ComponentDefinition = {
  type: "servo",
  name: "Micro Servo (SG90)",
  category: "output",
  width: 170.08,
  height: 119.55,
  pinTemplates: [
    { name: "gnd", type: "ground", x: 6.56, y: 50.06 },
    { name: "vcc", type: "power", x: 6.56, y: 59.66 },
    { name: "signal", type: "digital", x: 6.56, y: 69.26 },
  ],
  defaultMetadata: {},
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateServo,
  Renderer: ServoRenderer,
}
