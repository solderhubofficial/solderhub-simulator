import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulatePassive } from "@/lib/simulator/engine/component-simulation"
import { Ds18b20Renderer } from "@/components/simulator/components/ds18b20/renderer"

export const ds18b20Definition: ComponentDefinition = {
  type: "ds18b20",
  name: "DS18B20 Temperature Sensor",
  category: "input",
  width: 72,
  height: 106,
  pinTemplates: [
    { name: "GND", type: "ground", x: 16, y: 104 },
    { name: "DQ", type: "digital", x: 36, y: 104 },
    { name: "VDD", type: "power", x: 56, y: 104 },
  ],
  defaultMetadata: { temperature: 24, probeStyle: "waterproof" },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  // Electrical pin state is represented, but Dallas 1-Wire timing and ROM
  // commands are not yet emulated by SolderHub's voltage-level engine.
  simulate: simulatePassive,
  Renderer: Ds18b20Renderer,
}
