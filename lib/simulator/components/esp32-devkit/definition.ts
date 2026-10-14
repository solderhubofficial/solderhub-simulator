import type { ComponentDefinition, PinType } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateArduino } from "@/lib/simulator/engine/component-simulation"
import { Esp32DevkitRenderer } from "@/components/simulator/components/esp32-devkit/renderer"
import { getVelxioBoardLayout } from "@/lib/simulator/velxio-boards/layouts"

// Pin positions, pin names' order and artwork are Velxio's ESP32-DevKitC V4
// (see lib/simulator/velxio-boards), rotated to the same landscape orientation as
// before (antenna left, USB right; top header = GND, 23, 22 ... CLK). The
// SolderHub pin names (IO23, TXD0, SVP, ...) are unchanged so saved wires keep working.
const layout = getVelxioBoardLayout("esp32-devkit")!
export const BOARD_WIDTH = layout.width
export const BOARD_HEIGHT = layout.height

// Silkscreen label per pin (Velxio's own pin names).
export const PIN_LABELS: Record<string, string> = Object.fromEntries(layout.pins.map((p) => [p.name, p.velxioName.replace(/^D(\d)$/, "SD$1").replace(/\.\d+$/, "")]))

const ANALOG = new Set(["SVP", "SVN", "IO34", "IO35"])
function esp32PinType(name: string): PinType {
  if (/^GND/.test(name)) return "ground"
  if (name === "3V3" || name === "5V") return "power"
  if (ANALOG.has(name)) return "analog"
  return "digital"
}

const defaultPinModes: Record<string, string> = {
  IO2: "OUTPUT",
}
const defaultPinValues: Record<string, number> = {
  IO2: 1,
}

export const esp32DevkitDefinition: ComponentDefinition = {
  type: "esp32-devkit",
  name: "ESP32 DevKit (38-pin)",
  category: "board",
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  pinTemplates: layout.pins.map((p) => ({ name: p.name, type: esp32PinType(p.name), x: p.x, y: p.y })),
  defaultMetadata: {
    pinModes: { ...defaultPinModes },
    pinValues: { ...defaultPinValues },
  },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateArduino,
  Renderer: Esp32DevkitRenderer,
}
