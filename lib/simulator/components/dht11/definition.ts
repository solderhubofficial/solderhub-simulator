import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateDht11 } from "@/lib/simulator/engine/component-simulation"
import { Dht11Renderer } from "@/components/simulator/components/dht11/renderer"

export const dht11Definition: ComponentDefinition = {
  type: "dht11",
  name: "DHT11 Sensor",
  category: "input",
  width: 57,
  height: 117,
  pinTemplates: [
    { name: "VCC", type: "power", x: 15, y: 115 },
    { name: "DATA", type: "digital", x: 24.5, y: 115 },
    { name: "GND", type: "ground", x: 43.8, y: 115 },
  ],
  defaultMetadata: { temperature: 24, humidity: 50 },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateDht11,
  Renderer: Dht11Renderer,
}
