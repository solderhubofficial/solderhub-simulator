import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateSlideSwitch } from "@/lib/simulator/engine/component-simulation"
import { SlideSwitchRenderer } from "@/components/simulator/components/slide-switch/renderer"

export const slideSwitchDefinition: ComponentDefinition = {
  type: "slide-switch",
  name: "Slide Switch",
  category: "input",
  width: 64,
  height: 58,
  pinTemplates: [
    { name: "com", type: "passive", x: 16, y: 54 },
    { name: "nc", type: "passive", x: 32, y: 54 },
    { name: "no", type: "passive", x: 48, y: 54 },
  ],
  defaultMetadata: { on: false },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: (component, pins) => {
    const connections: [string, string][] = []
    const com = pins.find((pin) => pin.name === "com")
    const no = pins.find((pin) => pin.name === "no")
    const nc = pins.find((pin) => pin.name === "nc")
    const isOn = component.metadata.on === true

    if (com) {
      if (isOn && no) connections.push([com.id, no.id])
      if (!isOn && nc) connections.push([com.id, nc.id])
    }

    return connections
  },
  simulate: simulateSlideSwitch,
  Renderer: SlideSwitchRenderer,
}
