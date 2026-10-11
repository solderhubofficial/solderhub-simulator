import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulatePassive } from "@/lib/simulator/engine/component-simulation"
import { Rc522Renderer } from "@/components/simulator/components/rc522/renderer"

export const rc522Definition: ComponentDefinition = {
  type: "rc522",
  name: "RC522 RFID Reader",
  category: "input",
  width: 140,
  height: 146,
  pinTemplates: [
    { name: "SDA/SS", type: "digital", x: 23, y: 139 },
    { name: "SCK", type: "digital", x: 37, y: 139 },
    { name: "MOSI", type: "digital", x: 51, y: 139 },
    { name: "MISO", type: "digital", x: 65, y: 139 },
    { name: "IRQ", type: "digital", x: 79, y: 139 },
    { name: "GND", type: "ground", x: 93, y: 139 },
    { name: "RST", type: "digital", x: 107, y: 139 },
    { name: "3.3V", type: "power", x: 121, y: 139 },
  ],
  defaultMetadata: { uid: "DE AD BE EF", cardPresent: false, powered: false },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulatePassive,
  Renderer: Rc522Renderer,
}
