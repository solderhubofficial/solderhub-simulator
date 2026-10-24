import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateOled13 } from "@/lib/simulator/engine/component-simulation"
import { Oled13Renderer } from "@/components/simulator/components/oled-13/renderer"

// 1.3" I2C OLED module. The 4-pin header runs along the top edge, in the same
// VCC / GND / SCL / SDA order as the module artwork. Pin ids are derived from
// the pin names, so circuits wired before this layout change keep working.
export const oled13Definition: ComponentDefinition = {
  type: "oled-13",
  name: "1.3-inch OLED Display (I2C)",
  category: "output",
  width: 220,
  height: 210,
  pinTemplates: [
    { name: "VCC", type: "power", x: 89, y: 9 },
    { name: "GND", type: "ground", x: 113, y: 9 },
    { name: "SCL", type: "digital", x: 137, y: 9 },
    { name: "SDA", type: "digital", x: 161, y: 9 },
  ],
  defaultMetadata: { displayOn: true, i2cAddress: 0x3c },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateOled13,
  Renderer: Oled13Renderer,
}
