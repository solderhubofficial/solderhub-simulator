import type { ComponentDefinition, PinType } from "@/types/simulator"
import { RaspberryPi5Renderer } from "@/components/simulator/components/raspberry-pi-5/renderer"
import { simulateArduino } from "@/lib/simulator/engine/component-simulation"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"

// Standard 40-pin header map and source-image pixel calibration from Velxio's
// RaspberryPi5Element.ts at upstream commit a5ab392d45757f35d44fd6fc06aee5a501129e84.
const PI5_PIN_NAMES: Record<number, string> = {
  1: "3V3", 2: "5V",
  3: "GPIO2", 4: "5V",
  5: "GPIO3", 6: "GND",
  7: "GPIO4", 8: "GPIO14",
  9: "GND", 10: "GPIO15",
  11: "GPIO17", 12: "GPIO18",
  13: "GPIO27", 14: "GND",
  15: "GPIO22", 16: "GPIO23",
  17: "3V3", 18: "GPIO24",
  19: "GPIO10", 20: "GND",
  21: "GPIO9", 22: "GPIO25",
  23: "GPIO11", 24: "GPIO8",
  25: "GND", 26: "GPIO7",
  27: "ID_SD", 28: "ID_SC",
  29: "GPIO5", 30: "GND",
  31: "GPIO6", 32: "GPIO12",
  33: "GPIO13", 34: "GND",
  35: "GPIO19", 36: "GPIO16",
  37: "GPIO26", 38: "GPIO20",
  39: "GND", 40: "GPIO21",
}

const DISPLAY_WIDTH = 330
const DISPLAY_HEIGHT = 220
const SCALE = DISPLAY_WIDTH / 1024
const HEADER_X0 = 103
const HEADER_STEP = 26
const HEADER_Y_ODD = 32
const HEADER_Y_EVEN = 61

function getPinType(name: string): PinType {
  if (name === "GND") return "ground"
  if (name === "3V3" || name === "5V") return "power"
  if (name.startsWith("GPIO")) return "digital"
  return "passive"
}

const seenNames = new Map<string, number>()
const pinTemplates = Array.from({ length: 20 }, (_, column) => {
  const oddNumber = column * 2 + 1
  const evenNumber = oddNumber + 1
  return [oddNumber, evenNumber].map((physicalNumber) => {
    const sourceName = PI5_PIN_NAMES[physicalNumber]
    const occurrence = (seenNames.get(sourceName) ?? 0) + 1
    seenNames.set(sourceName, occurrence)
    return {
      name: occurrence === 1 ? sourceName : `${sourceName}_${occurrence}`,
      type: getPinType(sourceName),
      x: (HEADER_X0 + column * HEADER_STEP) * SCALE,
      y: (physicalNumber % 2 === 1 ? HEADER_Y_ODD : HEADER_Y_EVEN) * SCALE,
    }
  })
}).flat()

export const raspberryPi5Definition: ComponentDefinition = {
  type: "raspberry-pi-5",
  name: "Raspberry Pi 5",
  category: "board",
  width: DISPLAY_WIDTH,
  height: DISPLAY_HEIGHT,
  pinTemplates,
  defaultMetadata: { pinModes: {}, pinValues: {}, boardFamily: "raspberry-pi-5" },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateArduino,
  Renderer: RaspberryPi5Renderer,
}
