import type { ComponentDefinition } from "@/types/simulator"
import { TiltSwitchRenderer } from "@/components/simulator/components/tilt-switch/renderer"
import { simulateTiltSwitch } from "@/lib/simulator/engine/component-simulation"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"

export const tiltSwitchDefinition: ComponentDefinition = {
  type: "tilt-switch",
  name: "Tilt Switch",
  category: "input",
  width: 72,
  height: 48,
  pinTemplates: [
    { name: "pin1", type: "digital", x: 0, y: 34 },
    { name: "pin2", type: "digital", x: 72, y: 34 },
  ],
  defaultMetadata: { tilted: false },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: (component, pins) => {
    if (component.metadata.tilted !== true) return []
    const pin1 = pins.find((pin) => pin.name === "pin1")
    const pin2 = pins.find((pin) => pin.name === "pin2")
    return pin1 && pin2 ? [[pin1.id, pin2.id]] : []
  },
  simulate: simulateTiltSwitch,
  Renderer: TiltSwitchRenderer,
}
