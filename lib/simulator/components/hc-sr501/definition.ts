import type { ComponentDefinition } from "@/types/simulator"
import { HcSr501Renderer } from "@/components/simulator/components/hc-sr501/renderer"
import { simulateHcSr501 } from "@/lib/simulator/engine/component-simulation"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"

/**
 * HC-SR501 PIR module. The common module header is VCC, OUT, GND, but
 * always follow the silkscreen on the actual breakout. OUT is active HIGH.
 * This simulator models motion as a user-controlled digital event, not
 * real infrared optics, timing, or the module's analog front end.
 */
export const hcSr501Definition: ComponentDefinition = {
  type: "hc-sr501",
  name: "HC-SR501 PIR Motion Sensor",
  category: "input",
  width: 112,
  height: 104,
  pinTemplates: [
    { name: "vcc", type: "power", x: 38, y: 100 },
    { name: "out", type: "digital", x: 56, y: 100 },
    { name: "gnd", type: "ground", x: 74, y: 100 },
  ],
  defaultMetadata: {
    motionDetected: false,
    outputMode: "active-high",
    warmupSeconds: 30,
    retriggerable: true,
  },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateHcSr501,
  Renderer: HcSr501Renderer,
}
