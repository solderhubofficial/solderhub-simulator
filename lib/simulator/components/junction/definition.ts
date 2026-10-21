import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulatePassive } from "@/lib/simulator/engine/component-simulation"
import { JunctionRenderer } from "@/components/simulator/components/junction/renderer"
import { JUNCTION_SIZE } from "@/lib/simulator/utils/wire-junction"

/**
 * A wire-to-wire solder point. It has one pin, so every wire attached to it is on the same net;
 * it is created when a wire is joined onto the middle of another wire, and is not in the palette.
 */
export const junctionDefinition: ComponentDefinition = {
  type: "junction",
  name: "Junction",
  category: "passive",
  width: JUNCTION_SIZE,
  height: JUNCTION_SIZE,
  pinTemplates: [{ name: "P", type: "passive", x: JUNCTION_SIZE / 2, y: JUNCTION_SIZE / 2 }],
  defaultMetadata: {},
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulatePassive,
  Renderer: JunctionRenderer,
}
