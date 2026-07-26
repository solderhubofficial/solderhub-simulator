import type { ComponentDefinition, PinType } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateArduino } from "@/lib/simulator/engine/component-simulation"
import { Esp32DevkitRenderer } from "@/components/simulator/components/esp32-devkit/renderer"

// Board is now landscape, matching the reference photo 1:1 in pixel scale
// (600x296), with headers running left-to-right along the top and bottom
// edges instead of the previous top-to-bottom left/right columns.
export const BOARD_WIDTH = 600
export const BOARD_HEIGHT = 296

/** Top header, left to right (silkscreen order, ESP32 DevKitC v4) */
const TOP_PINS: { name: string; type: PinType; label: string }[] = [
  { name: "GND2", type: "ground", label: "GND" },
  { name: "IO23", type: "digital", label: "23" },
  { name: "IO22", type: "digital", label: "22" },
  { name: "TXD0", type: "digital", label: "TX" },
  { name: "RXD0", type: "digital", label: "RX" },
  { name: "IO21", type: "digital", label: "21" },
  { name: "GND3", type: "ground", label: "GND" },
  { name: "IO19", type: "digital", label: "19" },
  { name: "IO18", type: "digital", label: "18" },
  { name: "IO5", type: "digital", label: "5" },
  { name: "IO17", type: "digital", label: "17" },
  { name: "IO16", type: "digital", label: "16" },
  { name: "IO4", type: "digital", label: "4" },
  { name: "IO0", type: "digital", label: "0" },
  { name: "IO2", type: "digital", label: "2" },
  { name: "IO15", type: "digital", label: "15" },
  { name: "SD1", type: "digital", label: "D1" },
  { name: "SD0", type: "digital", label: "D0" },
  { name: "SCK", type: "digital", label: "CLK" },
]

/** Bottom header, left to right */
const BOTTOM_PINS: { name: string; type: PinType; label: string }[] = [
  { name: "3V3", type: "power", label: "3V3" },
  { name: "RST", type: "digital", label: "EN" },
  { name: "SVP", type: "analog", label: "VP" },
  { name: "SVN", type: "analog", label: "VN" },
  { name: "IO34", type: "analog", label: "34" },
  { name: "IO35", type: "analog", label: "35" },
  { name: "IO32", type: "digital", label: "32" },
  { name: "IO33", type: "digital", label: "33" },
  { name: "IO25", type: "digital", label: "25" },
  { name: "IO26", type: "digital", label: "26" },
  { name: "IO27", type: "digital", label: "27" },
  { name: "IO14", type: "digital", label: "14" },
  { name: "IO12", type: "digital", label: "12" },
  { name: "GND1", type: "ground", label: "GND" },
  { name: "IO13", type: "digital", label: "13" },
  { name: "SD2", type: "digital", label: "D2" },
  { name: "SD3", type: "digital", label: "D3" },
  { name: "CMD", type: "digital", label: "CMD" },
  { name: "5V", type: "power", label: "5V" },
]

// Pixel positions measured directly off the reference photo (600x296).
const TOP_ROW_Y = 30
const TOP_ROW_X0 = 70
const TOP_ROW_X1 = 579
const BOTTOM_ROW_Y = 280
const BOTTOM_ROW_X0 = 82
const BOTTOM_ROW_X1 = 576

const topSlotX = (i: number) => TOP_ROW_X0 + (i * (TOP_ROW_X1 - TOP_ROW_X0)) / (TOP_PINS.length - 1)
const bottomSlotX = (i: number) =>
  BOTTOM_ROW_X0 + (i * (BOTTOM_ROW_X1 - BOTTOM_ROW_X0)) / (BOTTOM_PINS.length - 1)

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
    ...TOP_PINS.map((p, i) => ({
      name: p.name,
      type: p.type,
      x: topSlotX(i),
      y: TOP_ROW_Y,
    })),
    ...BOTTOM_PINS.map((p, i) => ({
      name: p.name,
      type: p.type,
      x: bottomSlotX(i),
      y: BOTTOM_ROW_Y,
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

// Exported so the renderer can draw the correct silkscreen text per pin
// without duplicating this table.
export const PIN_LABELS: Record<string, string> = Object.fromEntries(
  [...TOP_PINS, ...BOTTOM_PINS].map((p) => [p.name, p.label])
)