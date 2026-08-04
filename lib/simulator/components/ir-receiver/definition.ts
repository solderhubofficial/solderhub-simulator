import type { ComponentDefinition } from "@/types/simulator"
import { IrReceiverRenderer } from "@/components/simulator/components/ir-receiver/renderer"
import { simulateIrReceiver } from "@/lib/simulator/engine/component-simulation"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"

export const irReceiverDefinition: ComponentDefinition = {
  type: "ir-receiver",
  name: "IR Receiver (VS1838B)",
  category: "input",
  width: 66,
  height: 76,
  pinTemplates: [
    { name: "out", type: "digital", x: 19, y: 76 },
    { name: "gnd", type: "ground", x: 33, y: 76 },
    { name: "vcc", type: "power", x: 47, y: 76 },
  ],
  defaultMetadata: { pulseActive: false },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateIrReceiver,
  Renderer: IrReceiverRenderer,
}
