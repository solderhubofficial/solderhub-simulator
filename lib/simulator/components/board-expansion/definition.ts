import type { ComponentDefinition, PinType } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateArduino } from "@/lib/simulator/engine/component-simulation"
import { BoardExpansionRenderer } from "@/components/simulator/components/board-expansion/renderer"
import { getVelxioBoardLayout } from "@/lib/simulator/velxio-boards/layouts"

type BoardSpec = { type: string; name: string; left?: string[]; right?: string[]; width?: number; height?: number; pitch?: number; firstY?: number; leftInset?: number; horizontal?: boolean }
const DIGITAL = new Set(["D0","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","TX","RX","SDA","SCL","SCK","MOSI","MISO","CS","RST","EN","BOOT","LED","GPIO0","GPIO1","GPIO2","GPIO3","GPIO4","GPIO5","GPIO6","GPIO7","GPIO8","GPIO9","GPIO10","GPIO18","GPIO19","GPIO20","GPIO21","GPIO22","GPIO23","GP0","GP1","GP2","GP3","GP4","GP5","GP6","GP7","GP8","GP9","GP10","GP11","GP12","GP13","GP14","GP15","GP16","GP17","GP18","GP19","GP20","GP21","GP22","GP25","GP26","GP27","GP28","PA0","PA1","PA2","PA3","PA4","PA5","PA6","PA7","PA8","PA9","PA10","PA11","PA12","PA15","PB0","PB1","PB2","PB3","PB4","PB5","PB6","PB7","PB8","PB9","PB10","PB11","PB12","PB13","PB14","PB15","PC13","PC14","PC15","GPIO14","GPIO15","GPIO16","GPIO17","GPIO12","GPIO13","GPIO25","GPIO26","GPIO27","GPIO32","GPIO33","GPIO34","GPIO35","GPIO36","GPIO39"])
const ANALOG = new Set(["A0","A1","A2","A3","A4","A5","A6","A7","ADC0","ADC1","ADC2","ADC3","ADC4","ADC5","VP","VN","GPIO32","GPIO33","GPIO34","GPIO35","GPIO36","GPIO39","GP26","GP27","GP28","PA0","PA1","PA2","PA3","PA4","PA5","PA6","PA7"])
const POWER = new Set(["3V3","3V3_EN","3V3_OUT","5V","VBUS","VIN","VSYS","VBAT","VCC","IOREF"])
const GROUND = new Set(["GND","GND1","GND2","GND3","AGND"])
function pinType(name: string): PinType {
  if (GROUND.has(name)) return "ground"
  if (POWER.has(name)) return "power"
  if (ANALOG.has(name) || /^A\d+$/.test(name)) return "analog"
  if (DIGITAL.has(name) || /^(D|IO|GPIO|GP|PA|PB|PC)\d+$/.test(name)) return "digital"
  return "passive"
}
function uniquePinNames(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((name) => {
    const count = (seen.get(name) ?? 0) + 1
    seen.set(name, count)
    return count === 1 ? name : `${name}_${count}`
  })
}
const BOARD_ARTWORK_RATIO: Record<string, number> = {
  "nodemcu-esp8266": 72 / 141,
}
function buildBoard(spec: BoardSpec): ComponentDefinition {
  // Boards that ship Velxio geometry take their pin positions, names and size
  // straight from it (see lib/simulator/velxio-boards).
  const velxio = getVelxioBoardLayout(spec.type)
  if (velxio) {
    return {
      type: spec.type,
      name: spec.name,
      category: "board",
      width: velxio.width,
      height: velxio.height,
      pinTemplates: velxio.pins.map((pin) => ({ name: pin.name, type: pinType(pin.name.replace(/_\d+$/, "")), x: pin.x, y: pin.y })),
      defaultMetadata: { pinModes: {}, pinValues: {}, boardFamily: spec.type },
      canConnectPins: defaultCanConnectPins,
      getInternalConnections: () => [],
      simulate: simulateArduino,
      Renderer: BoardExpansionRenderer,
    }
  }
  const specLeft = spec.left ?? []
  const specRight = spec.right ?? []
  const pitch = spec.pitch ?? 16
  const rows = Math.max(specLeft.length, specRight.length)
  const isNodeMcu = spec.type === "nodemcu-esp8266"
  const height = spec.height ?? (isNodeMcu ? 352 : Math.max(220, 24 + (rows - 1) * pitch))
  const width = BOARD_ARTWORK_RATIO[spec.type] ? Math.round(height * BOARD_ARTWORK_RATIO[spec.type]) : (spec.width ?? 260)
  const leftX = isNodeMcu ? 9.3 : (spec.leftInset ?? 9)
  const rightX = isNodeMcu ? 170.7 : width - (spec.leftInset ?? 9)
  const firstY = isNodeMcu ? 40.6 : (spec.firstY ?? 12)
  const allNames = uniquePinNames([...specLeft, ...specRight])
  const leftNames = allNames.slice(0, specLeft.length)
  const rightNames = allNames.slice(specLeft.length)
  const pinTemplates = [
    // The NodeMCU SVG scales from a 72×141 viewBox to 180×352. Its first
    // plated holes are at source x≈16.26/16.03, so their canvas y anchors are
    // ≈40.6/40.0 (not 45.3/44.7). The old anchors put every wire endpoint
    // about 5 world units below the visible gold pads.
    ...leftNames.map((name, i) => ({ name, type: pinType(name.replace(/_\d+$/, "")), x: leftX, y: firstY + i * pitch })),
    ...rightNames.map((name, i) => ({ name, type: pinType(name.replace(/_\d+$/, "")), x: rightX, y: (isNodeMcu ? 40.0 : firstY) + i * pitch })),
  ]
  return {
    type: spec.type,
    name: spec.name,
    category: "board",
    width,
    height,
    pinTemplates,
    defaultMetadata: { pinModes: {}, pinValues: {}, boardFamily: spec.type },
    canConnectPins: defaultCanConnectPins,
    getInternalConnections: () => [],
    simulate: simulateArduino,
    Renderer: BoardExpansionRenderer,
  }
}

export const arduinoNanoDefinition = buildBoard({ type: "arduino-nano", name: "Arduino Nano" })
export const arduinoMegaDefinition = buildBoard({ type: "arduino-mega", name: "Arduino Mega 2560" })
export const nodemcuDefinition = buildBoard({
  type: "nodemcu-esp8266", name: "NodeMCU ESP8266", pitch: 18,
  left: ["A0","RSV","RSV","SD3","SD2","SD1","CMD","SD0","CLK","GND","3V3","EN","RST","GND","VIN"],
  right: ["D0","D1","D2","D3","D4","3V3","GND","D5","D6","D7","D8","RX","TX","GND","3V3"],
})
export const esp32C3Definition = buildBoard({ type: "esp32-c3", name: "ESP32-C3 DevKitM-1" })
export const bluePillDefinition = buildBoard({ type: "stm32-blue-pill", name: "STM32 Blue Pill (F103C8)" })
export const blackPillDefinition = buildBoard({ type: "stm32-black-pill", name: "STM32 Black Pill (F411CE)" })
export const picoDefinition = buildBoard({ type: "raspberry-pi-pico", name: "Raspberry Pi Pico" })
