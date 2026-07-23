import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateLcd1602 } from "@/lib/simulator/engine/component-simulation"
import { Lcd1602Renderer } from "@/components/simulator/components/lcd1602/renderer"

export const lcd1602Definition: ComponentDefinition = {
  type: "lcd1602",
  name: "LCD 1602 (I2C)",
  category: "output",
  width: 280,
  height: 132,
  pinTemplates: [
    { name: "GND", type: "ground", x: 218, y: 130 },
    { name: "VCC", type: "power", x: 238, y: 130 },
    { name: "SDA", type: "digital", x: 258, y: 130 },
    { name: "SCL", type: "digital", x: 276, y: 130 },
  ],
  defaultMetadata: { line1: "Hello, World!", line2: "SolderHub Sim", backlight: true },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateLcd1602,
  Renderer: Lcd1602Renderer,
}
