import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulatePotentiometer } from "@/lib/simulator/engine/component-simulation"
import { PotentiometerRenderer } from "@/components/simulator/components/potentiometer/renderer"

export const potentiometerDefinition: ComponentDefinition = {
  type: "potentiometer",
  name: "Potentiometer",
  category: "input",
  width: 64,
  height: 74,
  pinTemplates: [
    { name: "gnd", type: "ground", x: 14, y: 72 },
    { name: "wiper", type: "analog", x: 32, y: 72 },
    { name: "vcc", type: "power", x: 50, y: 72 },
  ],
  defaultMetadata: { position: 0.5 },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulatePotentiometer,
  Renderer: PotentiometerRenderer,
}
