import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulatePassive } from "@/lib/simulator/engine/component-simulation"
import { Rc522Renderer } from "@/components/simulator/components/rc522/renderer"

export const rc522Definition: ComponentDefinition = {
  type: "rc522",
  name: "RC522 RFID Reader",
  category: "input",
  width: 180,
  height: 170,
  pinTemplates: [
    { name: "SDA/SS", type: "digital", x: 18, y: 163 },
    { name: "SCK", type: "digital", x: 38, y: 163 },
    { name: "MOSI", type: "digital", x: 58, y: 163 },
    { name: "MISO", type: "digital", x: 78, y: 163 },
    { name: "IRQ", type: "digital", x: 98, y: 163 },
    { name: "GND", type: "ground", x: 118, y: 163 },
    { name: "RST", type: "digital", x: 138, y: 163 },
    { name: "3.3V", type: "power", x: 158, y: 163 },
  ],
  defaultMetadata: { uid: "DE AD BE EF", cardPresent: false, powered: false },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulatePassive,
  Renderer: Rc522Renderer,
}
