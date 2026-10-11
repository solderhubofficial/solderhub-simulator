import type { ComponentDefinition, PinType } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateArduino } from "@/lib/simulator/engine/component-simulation"
import { BoardExpansionRenderer } from "@/components/simulator/components/board-expansion/renderer"

type BoardSpec = { type: string; name: string; left: string[]; right: string[]; width?: number; pitch?: number; horizontal?: boolean }
const DIGITAL = new Set(["D0","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","TX","RX","SDA","SCL","SCK","MOSI","MISO","CS","RST","EN","BOOT","LED","GPIO0","GPIO1","GPIO2","GPIO3","GPIO4","GPIO5","GPIO6","GPIO7","GPIO8","GPIO9","GPIO10","GPIO18","GPIO19","GPIO20","GPIO21","GPIO22","GPIO23","GP0","GP1","GP2","GP3","GP4","GP5","GP6","GP7","GP8","GP9","GP10","GP11","GP12","GP13","GP14","GP15","GP16","GP17","GP18","GP19","GP20","GP21","GP22","GP25","GP26","GP27","GP28","PA0","PA1","PA2","PA3","PA4","PA5","PA6","PA7","PA8","PA9","PA10","PA11","PA12","PA15","PB0","PB1","PB2","PB3","PB4","PB5","PB6","PB7","PB8","PB9","PB10","PB11","PB12","PB13","PB14","PB15","PC13","PC14","PC15","GPIO14","GPIO15","GPIO16","GPIO17","GPIO12","GPIO13","GPIO25","GPIO26","GPIO27","GPIO32","GPIO33","GPIO34","GPIO35","GPIO36","GPIO39"])
const ANALOG = new Set(["A0","A1","A2","A3","A4","A5","A6","A7","ADC0","ADC1","ADC2","ADC3","ADC4","ADC5","VP","VN","GPIO32","GPIO33","GPIO34","GPIO35","GPIO36","GPIO39","GP26","GP27","GP28","PA0","PA1","PA2","PA3","PA4","PA5","PA6","PA7"])
const POWER = new Set(["3V3","3V3_EN","3V3_OUT","5V","VBUS","VIN","VSYS","VBAT","VCC","IOREF"])
const GROUND = new Set(["GND","GND1","GND2","GND3","AGND"])
function pinType(name: string): PinType {
  if (GROUND.has(name)) return "ground"
  if (POWER.has(name)) return "power"
  if (ANALOG.has(name)) return "analog"
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
  "arduino-nano": 17.8 / 44.9,
  "arduino-mega": 50.8 / 102.66,
  "esp32-c3": 25.4 / 42.9,
  "stm32-blue-pill": 22.855 / 54.193,
  "stm32-black-pill": 20.695 / 53.125,
  "raspberry-pi-pico": 79 / 200,
}
function buildBoard(spec: BoardSpec): ComponentDefinition {
  const pitch = spec.pitch ?? 16
  const rows = Math.max(spec.left.length, spec.right.length)
  const height = Math.max(220, 24 + (rows - 1) * pitch)
  const width = spec.width ?? (BOARD_ARTWORK_RATIO[spec.type] ? Math.round(height * BOARD_ARTWORK_RATIO[spec.type]) : 260)
  const leftX = 9
  const rightX = width - 9
  const allNames = uniquePinNames([...spec.left, ...spec.right])
  const leftNames = allNames.slice(0, spec.left.length)
  const rightNames = allNames.slice(spec.left.length)
  const pinTemplates = [
    ...leftNames.map((name, i) => ({ name, type: pinType(name.replace(/_\\d+$/, "")), x: leftX, y: 12 + i * pitch })),
    ...rightNames.map((name, i) => ({ name, type: pinType(name.replace(/_\\d+$/, "")), x: rightX, y: 12 + i * pitch })),
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

export const arduinoNanoDefinition = buildBoard({
  type: "arduino-nano", name: "Arduino Nano", pitch: 15,
  left: ["D13","3V3","AREF","A0","A1","A2","A3","A4","A5","A6","A7","5V","RST","GND","VIN"],
  right: ["D12","D11","D10","D9","D8","D7","D6","D5","D4","D3","D2","GND","RST","RX","TX"],
})
export const arduinoMegaDefinition = buildBoard({
  type: "arduino-mega", name: "Arduino Mega 2560", width: 340, pitch: 15,
  left: ["IOREF","RESET","3V3","5V","GND","GND","VIN","A0","A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15","D22","D24","D26","D28","D30","D32","D34","D36","D38","D40","D42","D44","D46","D48","D50","D52"],
  right: ["D0","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18","D19","D20","D21","D23","D25","D27","D29","D31","D33","D35","D37","D39","D41","D43","D45","D47","D49","D51","D53"],
})
export const nodemcuDefinition = buildBoard({
  type: "nodemcu-esp8266", name: "NodeMCU ESP8266", pitch: 18,
  left: ["A0","RSV","RSV","SD3","SD2","SD1","CMD","SD0","CLK","GND","3V3","EN","RST","GND","VIN"],
  right: ["D0","D1","D2","D3","D4","3V3","GND","D5","D6","D7","D8","RX","TX","GND","3V3"],
})
export const esp32C3Definition = buildBoard({
  type: "esp32-c3", name: "ESP32-C3 DevKitM-1", pitch: 18,
  left: ["5V","GND","3V3","EN","GPIO4","GPIO5","GPIO6","GPIO7","GPIO8","GPIO9","GPIO10","GPIO20","GPIO21"],
  right: ["GND","GPIO0","GPIO1","GPIO2","GPIO3","GPIO18","GPIO19","GPIO20","RX","TX","GPIO21","GND","3V3"],
})
export const bluePillDefinition = buildBoard({
  type: "stm32-blue-pill", name: "STM32 Blue Pill (F103C8)", pitch: 14,
  left: ["PB12","PB13","PB14","PB15","PA8","PA9","PA10","PA11","PA12","PA15","PB3","PB4","PB5","PB6","PB7","PB8","PB9","5V","GND","3V3"],
  right: ["GND","GND","3V3","NRST","PB11","PB10","PB1","PB0","PA7","PA6","PA5","PA4","PA3","PA2","PA1","PA0","PC15","PC14","PC13","VBAT"],
})
export const blackPillDefinition = buildBoard({
  type: "stm32-black-pill", name: "STM32 Black Pill (F411CE)", pitch: 14,
  left: ["VBAT","PC13","PC14","PC15","NRST","PA0","PA1","PA2","PA3","PA4","PA5","PA6","PA7","PB0","PB1","PB2","PB10","3V3","GND","5V"],
  right: ["3V3","GND","5V","PB9","PB8","PB7","PB6","PB5","PB4","PB3","PA15","PA12","PA11","PA10","PA9","PA8","PB15","PB14","PB13","PB12"],
})
export const picoDefinition = buildBoard({
  type: "raspberry-pi-pico", name: "Raspberry Pi Pico", pitch: 15,
  left: ["GP0","GP1","GND","GP2","GP3","GP4","GP5","GND","GP6","GP7","GP8","GP9","GND","GP10","GP11","GP12","GP13","GND","GP14","GP15"],
  right: ["VBUS","VSYS","GND","3V3_EN","3V3_OUT","ADC_VREF","GP28","GND","GP27","GP26","RUN","GP22","GND","GP21","GP20","GP19","GP18","GND","GP17","GP16"],
})
export const raspberryPi5Definition = buildBoard({
  type: "raspberry-pi-5", name: "Raspberry Pi 5 (GPIO header)", width: 400, pitch: 15,
  left: ["3V3","5V","GPIO2","5V","GPIO3","GND","GPIO4","GPIO14","GND","GPIO15","GPIO17","GPIO18","GPIO27","GND","GPIO22","GPIO23","3V3","GPIO24","GPIO10","GND"],
  right: ["5V","5V","GND","GPIO14","GPIO15","GPIO18","GND","GPIO23","GPIO24","GND","GPIO25","GPIO8","GPIO7","GPIO1","GND","GPIO12","GND","GPIO16","GPIO20","GPIO21"],
})
