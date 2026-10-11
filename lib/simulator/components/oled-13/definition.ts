import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulatePassive } from "@/lib/simulator/engine/component-simulation"
import { Oled13Renderer } from "@/components/simulator/components/oled-13/renderer"

export const oled13Definition: ComponentDefinition = {
  type: "oled-13",
  name: "1.3-inch OLED Display (I2C)",
  category: "output",
  width: 280,
  height: 150,
  pinTemplates: [
    { name: "GND", type: "ground", x: 196, y: 148 },
    { name: "VCC", type: "power", x: 218, y: 148 },
    { name: "SCL", type: "digital", x: 240, y: 148 },
    { name: "SDA", type: "digital", x: 262, y: 148 },
  ],
  defaultMetadata: { line1: "SolderHub", line2: "1.3-inch OLED", backlight: true },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulatePassive,
  Renderer: Oled13Renderer,
}
