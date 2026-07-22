import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateLed } from "@/lib/simulator/engine/component-simulation"
import { LedRenderer } from "@/components/simulator/components/led/renderer"

export const ledDefinition: ComponentDefinition = {
  type: "led",
  name: "LED",
  category: "output",
  width: 40,
  height: 70,
  pinTemplates: [
    { name: "anode", type: "passive", x: 13, y: 68 },
    { name: "cathode", type: "passive", x: 27, y: 60 },
  ],
  defaultMetadata: { color: "red" },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateLed,
  Renderer: LedRenderer,
}
