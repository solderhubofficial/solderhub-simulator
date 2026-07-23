import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateDht11 } from "@/lib/simulator/engine/component-simulation"
import { Dht11Renderer } from "@/components/simulator/components/dht11/renderer"

export const dht11Definition: ComponentDefinition = {
  type: "dht11",
  name: "DHT11 Sensor",
  category: "input",
  width: 56,
  height: 78,
  pinTemplates: [
    { name: "GND", type: "ground", x: 12, y: 76 },
    { name: "DATA", type: "digital", x: 28, y: 76 },
    { name: "VCC", type: "power", x: 44, y: 76 },
  ],
  defaultMetadata: { temperature: 24, humidity: 50 },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateDht11,
  Renderer: Dht11Renderer,
}
