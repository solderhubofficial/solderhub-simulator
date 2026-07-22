import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulatePushButton } from "@/lib/simulator/engine/component-simulation"
import { PushButtonRenderer } from "@/components/simulator/components/push-button/renderer"

export const pushButtonDefinition: ComponentDefinition = {
  type: "push-button",
  name: "Push Button",
  category: "input",
  width: 56,
  height: 50,
  pinTemplates: [
    { name: "pin1", type: "digital", x: 2, y: 25 },
    { name: "pin2", type: "digital", x: 54, y: 25 },
  ],
  defaultMetadata: { pressed: false },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: (component, pins) => {
    if (component.metadata.pressed !== true) return []
    const a = pins.find((p) => p.name === "pin1")
    const b = pins.find((p) => p.name === "pin2")
    return a && b ? [[a.id, b.id]] : []
  },
  simulate: simulatePushButton,
  Renderer: PushButtonRenderer,
}
