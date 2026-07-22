import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateArduino } from "@/lib/simulator/engine/component-simulation"
import { ArduinoUnoRenderer } from "@/components/simulator/components/arduino-uno/renderer"

export const BOARD_WIDTH = 460
export const BOARD_HEIGHT = 360

// Top edge header, left-to-right, matching the real UNO silkscreen order.
const TOP_LEFT = ["D13", "D12", "D11", "D10", "D9", "D8"]
const TOP_RIGHT = ["D7", "D6", "D5", "D4", "D3", "D2", "D1", "D0"]

const TOP_LEFT_START = 70
const TOP_RIGHT_START = 230
const TOP_STEP = 24
const TOP_Y = 6

const DIGITAL_PINS = [
  ...TOP_LEFT.map((name, i) => ({ name, x: TOP_LEFT_START + i * TOP_STEP, y: TOP_Y })),
  ...TOP_RIGHT.map((name, i) => ({ name, x: TOP_RIGHT_START + i * TOP_STEP, y: TOP_Y })),
]

const ANALOG_PINS = ["A0", "A1", "A2", "A3", "A4", "A5"].map((name, i) => ({
  name,
  x: 330 + i * 22,
  y: BOARD_HEIGHT - 6,
}))

const POWER_PINS = [
  { name: "5V", x: 172, y: BOARD_HEIGHT - 6, type: "power" as const },
  { name: "3.3V", x: 194, y: BOARD_HEIGHT - 6, type: "power" as const },
  { name: "GND1", x: 216, y: BOARD_HEIGHT - 6, type: "ground" as const },
  { name: "GND2", x: 238, y: BOARD_HEIGHT - 6, type: "ground" as const },
  { name: "VIN", x: 260, y: BOARD_HEIGHT - 6, type: "power" as const },
]

const defaultPinModes: Record<string, string> = { D13: "OUTPUT" }
const defaultPinValues: Record<string, number> = { D13: 1 }

export const arduinoUnoDefinition: ComponentDefinition = {
  type: "arduino-uno",
  name: "Arduino Uno",
  category: "board",
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  pinTemplates: [
    ...DIGITAL_PINS.map((p) => ({ ...p, type: "digital" as const })),
    ...ANALOG_PINS.map((p) => ({ ...p, type: "analog" as const })),
    ...POWER_PINS,
  ],
  defaultMetadata: {
    pinModes: { ...defaultPinModes },
    pinValues: { ...defaultPinValues },
  },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateArduino,
  Renderer: ArduinoUnoRenderer,
}
