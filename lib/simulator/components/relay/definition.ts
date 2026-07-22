import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateRelay } from "@/lib/simulator/engine/component-simulation"
import { RelayRenderer } from "@/components/simulator/components/relay/renderer"

export const relayDefinition: ComponentDefinition = {
  type: "relay",
  name: "Relay Module",
  category: "output",
  width: 118,
  height: 96,
  pinTemplates: [
    // Left header (module control side)
    { name: "coil-", type: "passive", x: -6, y: 62 }, // labeled "GND" on the board
    { name: "coil+", type: "passive", x: -6, y: 82 }, // labeled "IN" on the board
    // Right screw terminals (switched side)
    { name: "NO", type: "passive", x: 124, y: 42 },
    { name: "COM", type: "passive", x: 124, y: 62 },
    { name: "NC", type: "passive", x: 124, y: 82 },
  ],
  defaultMetadata: {},
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateRelay,
  Renderer: RelayRenderer,
}
