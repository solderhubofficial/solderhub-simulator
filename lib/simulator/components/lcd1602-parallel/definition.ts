import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateLcd1602 } from "@/lib/simulator/engine/component-simulation"
import { Lcd1602ParallelRenderer } from "@/components/simulator/components/lcd1602-parallel/renderer"

export const lcd1602ParallelDefinition: ComponentDefinition = {
  type: "lcd1602-parallel",
  name: "LCD 1602 (Parallel)",
  category: "output",
  width: 280,
  height: 132,
  pinTemplates: [
    { name: "RS", type: "digital", x: 204, y: 130 },
    { name: "E", type: "digital", x: 214, y: 130 },
    { name: "D4", type: "digital", x: 224, y: 130 },
    { name: "D5", type: "digital", x: 234, y: 130 },
    { name: "D6", type: "digital", x: 244, y: 130 },
    { name: "D7", type: "digital", x: 254, y: 130 },
    { name: "VCC", type: "power", x: 264, y: 130 },
    { name: "GND", type: "ground", x: 274, y: 130 },
  ],
  defaultMetadata: { line1: "", line2: "", backlight: true, displayOn: true },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateLcd1602,
  Renderer: Lcd1602ParallelRenderer,
}
