import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateBattery } from "@/lib/simulator/engine/component-simulation"
import { BatteryRenderer } from "@/components/simulator/components/battery/renderer"

export const batteryDefinition: ComponentDefinition = {
  type: "battery",
  name: "Battery",
  category: "active",
  width: 40,
  height: 80,
  pinTemplates: [
    { name: "positive", type: "power", x: 20, y: 4 },
    { name: "negative", type: "ground", x: 20, y: 76 },
  ],
  defaultMetadata: { voltage: 5 },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateBattery,
  Renderer: BatteryRenderer,
}
