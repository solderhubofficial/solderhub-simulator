import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateBuzzer } from "@/lib/simulator/engine/component-simulation"
import { BuzzerRenderer } from "@/components/simulator/components/buzzer/renderer"

export const buzzerDefinition: ComponentDefinition = {
  type: "buzzer",
  name: "Buzzer",
  category: "output",
  width: 50,
  height: 66,
  pinTemplates: [
    { name: "positive", type: "passive", x: 17, y: 64 },
    { name: "negative", type: "passive", x: 33, y: 58 },
  ],
  defaultMetadata: {},
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateBuzzer,
  Renderer: BuzzerRenderer,
}
