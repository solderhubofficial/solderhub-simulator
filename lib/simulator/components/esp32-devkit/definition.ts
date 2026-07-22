import type { ComponentDefinition, PinType } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateArduino } from "@/lib/simulator/engine/component-simulation"
import { Esp32DevkitRenderer } from "@/components/simulator/components/esp32-devkit/renderer"

/** Left header, top to bottom (silkscreen order, MH-ET LIVE ESP32 DEVKIT 38-pin) */
const LEFT_PINS: { name: string; type: PinType }[] = [
  { name: "3V3", type: "power" },
  { name: "RST", type: "digital" },
  { name: "SVP", type: "analog" },
  { name: "SVN", type: "analog" },
  { name: "IO34", type: "analog" },
  { name: "IO35", type: "analog" },
  { name: "IO32", type: "digital" },
  { name: "IO33", type: "digital" },
  { name: "IO25", type: "digital" },
  { name: "IO26", type: "digital" },
  { name: "IO27", type: "digital" },
  { name: "IO14", type: "digital" },
  { name: "IO12", type: "digital" },
  { name: "GND1", type: "ground" },
  { name: "IO13", type: "digital" },
  { name: "SD2", type: "digital" },
  { name: "SD3", type: "digital" },
  { name: "CMD", type: "digital" },
  { name: "5V", type: "power" },
]

/** Right header, top to bottom */
const RIGHT_PINS: { name: string; type: PinType }[] = [
  { name: "GND2", type: "ground" },
  { name: "IO23", type: "digital" },
  { name: "IO22", type: "digital" },
  { name: "TXD0", type: "digital" },
  { name: "RXD0", type: "digital" },
  { name: "IO21", type: "digital" },
  { name: "GND3", type: "ground" },
  { name: "IO19", type: "digital" },
  { name: "IO18", type: "digital" },
  { name: "IO5", type: "digital" },
  { name: "IO17", type: "digital" },
  { name: "IO16", type: "digital" },
  { name: "IO4", type: "digital" },
  { name: "IO0", type: "digital" },
  { name: "IO2", type: "digital" },
  { name: "IO15", type: "digital" },
  { name: "SD1", type: "digital" },
  { name: "SD0", type: "digital" },
  { name: "SCK", type: "digital" },
]

const ROW_STEP = 22
const ROW_START = 50
const BOARD_WIDTH = 220
const BOARD_HEIGHT = 480

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
  pinTemplates: [
    ...LEFT_PINS.map((p, i) => ({
      name: p.name,
      type: p.type,
      x: 12,
      y: ROW_START + i * ROW_STEP,
    })),
    ...RIGHT_PINS.map((p, i) => ({
      name: p.name,
      type: p.type,
      x: BOARD_WIDTH - 12,
      y: ROW_START + i * ROW_STEP,
    })),
  ],
  defaultMetadata: {
    pinModes: { ...defaultPinModes },
    pinValues: { ...defaultPinValues },
  },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateArduino,
  Renderer: Esp32DevkitRenderer,
}
