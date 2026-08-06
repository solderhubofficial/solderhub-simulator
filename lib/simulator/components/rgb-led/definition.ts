import type { ComponentDefinition } from "@/types/simulator"
import { RgbLedRenderer } from "@/components/simulator/components/rgb-led/renderer"
import { simulateRgbLed } from "@/lib/simulator/engine/component-simulation"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"

export const rgbLedDefinition: ComponentDefinition = {
  type: "rgb-led",
  name: "RGB LED",
  category: "output",
  width: 60,
  height: 72,
  pinTemplates: [
    { name: "red", type: "digital", x: 12, y: 70 },
    { name: "cathode", type: "ground", x: 24, y: 70 },
    { name: "green", type: "digital", x: 36, y: 70 },
    { name: "blue", type: "digital", x: 48, y: 70 },
  ],
  defaultMetadata: {},
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateRgbLed,
  Renderer: RgbLedRenderer,
}
