import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulatePassive } from "@/lib/simulator/engine/component-simulation"
import { ResistorRenderer } from "@/components/simulator/components/resistor/renderer"

export const resistorDefinition: ComponentDefinition = {
  type: "resistor",
  name: "Resistor",
  category: "passive",
  width: 80,
  height: 30,
  pinTemplates: [
    { name: "A", type: "passive", x: 0, y: 15 },
    { name: "B", type: "passive", x: 80, y: 15 },
  ],
  defaultMetadata: { resistance: 220, unit: "Ω" },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: (_c, pins) => {
    const a = pins.find((p) => p.name === "A")
    const b = pins.find((p) => p.name === "B")
    return a && b ? [[a.id, b.id]] : []
  },
  simulate: simulatePassive,
  Renderer: ResistorRenderer,
}
