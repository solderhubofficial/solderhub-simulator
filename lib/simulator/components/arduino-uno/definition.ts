import type { ComponentDefinition, PinType } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateArduino } from "@/lib/simulator/engine/component-simulation"
import { ArduinoUnoRenderer } from "@/components/simulator/components/arduino-uno/renderer"
import { getVelxioBoardLayout } from "@/lib/simulator/velxio-boards/layouts"

// Pin positions, names and artwork come from Velxio / Wokwi's Arduino Uno
// (see lib/simulator/velxio-boards). Pins the previous hand-drawn board did not
// have (AREF, IOREF, RESET, SCL, SDA, third GND) are now wireable too; the
// original pin names (D0-D13, A0-A5, 5V, 3.3V, GND1, GND2, VIN) are unchanged.
const layout = getVelxioBoardLayout("arduino-uno")!

export const BOARD_WIDTH = layout.width
export const BOARD_HEIGHT = layout.height

function unoPinType(name: string): PinType {
  if (/^GND/.test(name)) return "ground"
  if (/^A\d$/.test(name)) return "analog"
  if (/^D\d+$/.test(name) || name === "SDA" || name === "SCL") return "digital"
  if (name === "5V" || name === "3.3V" || name === "VIN" || name === "IOREF") return "power"
  return "passive"
}

const defaultPinModes: Record<string, string> = { D13: "OUTPUT" }
const defaultPinValues: Record<string, number> = { D13: 1 }

export const arduinoUnoDefinition: ComponentDefinition = {
  type: "arduino-uno",
  name: "Arduino Uno",
  category: "board",
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  pinTemplates: layout.pins.map((pin) => ({ name: pin.name, type: unoPinType(pin.name), x: pin.x, y: pin.y })),
  defaultMetadata: {
    pinModes: { ...defaultPinModes },
    pinValues: { ...defaultPinValues },
  },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateArduino,
  Renderer: ArduinoUnoRenderer,
}
