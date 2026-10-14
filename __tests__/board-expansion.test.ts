import { describe, expect, it } from "vitest"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"

const expandedBoards = [
  "arduino-nano",
  "arduino-mega",
  "nodemcu-esp8266",
  "esp32-c3",
  "stm32-blue-pill",
  "stm32-black-pill",
  "raspberry-pi-pico",
  "raspberry-pi-5",
]

describe("expanded board registry", () => {
  it.each(expandedBoards)("registers %s as a board with valid, unique wire pins", (type) => {
    const definition = getComponentDefinition(type)
    expect(definition).toBeDefined()
    expect(definition?.category).toBe("board")
    expect(definition!.pinTemplates.length).toBeGreaterThanOrEqual(20)

    const names = definition!.pinTemplates.map((pin) => pin.name)
    expect(new Set(names).size).toBe(names.length)

    const pins = instantiatePins("test-board", definition!.pinTemplates)
    const ids = pins.map((pin) => pin.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const pin of pins) {
      expect(pin.x).toBeGreaterThanOrEqual(0)
      expect(pin.x).toBeLessThanOrEqual(definition!.width)
      expect(pin.y).toBeGreaterThanOrEqual(0)
      expect(pin.y).toBeLessThanOrEqual(definition!.height)
    }
  })

  it("aligns NodeMCU wire anchors with the authentic SVG pin-hole rows", () => {
    const definition = getComponentDefinition("nodemcu-esp8266")
    expect(definition).toBeDefined()
    const left = definition!.pinTemplates.filter((pin) => pin.x < definition!.width / 2)
    const right = definition!.pinTemplates.filter((pin) => pin.x > definition!.width / 2)
    expect(left[0].y).toBeCloseTo(40.6, 1)
    expect(right[0].y).toBeCloseTo(40.0, 1)
    expect(left[1].y - left[0].y).toBe(18)
    expect(right[1].y - right[0].y).toBe(18)
  })
})


import { getVelxioBoardLayout } from "@/lib/simulator/velxio-boards/layouts"
import { VELXIO_BOARD_DATA } from "@/lib/simulator/velxio-boards/velxio-board-data"

const MM_PX = 96 / 25.4
const velxioBoards = Object.keys(VELXIO_BOARD_DATA)

// Pin names the boards exposed before they were switched to Velxio geometry.
// Saved wires reference `<componentId>_<pinName>`, so none of these may disappear.
const range = (prefix: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`)
const previousPinNames: Record<string, string[]> = {
  "arduino-uno": [...range("D", 0, 13), ...range("A", 0, 5), "5V", "3.3V", "GND1", "GND2", "VIN"],
  "esp32-devkit": [
    "GND2","IO23","IO22","TXD0","RXD0","IO21","GND3","IO19","IO18","IO5","IO17","IO16","IO4","IO0","IO2","IO15","SD1","SD0","SCK",
    "3V3","RST","SVP","SVN","IO34","IO35","IO32","IO33","IO25","IO26","IO27","IO14","IO12","GND1","IO13","SD2","SD3","CMD","5V",
  ],
  "arduino-nano": [...range("D", 2, 13), "3V3", "AREF", ...range("A", 0, 7), "5V", "RST", "GND", "VIN", "GND_2", "RST_2", "RX", "TX"],
  "arduino-mega": [...range("D", 0, 53), ...range("A", 0, 15), "IOREF", "RESET", "3V3", "5V", "GND", "GND_2", "VIN"],
  "stm32-blue-pill": ["PB12", "PA8", "PA15", "PB9", "5V", "GND", "3V3", "GND_2", "GND_3", "3V3_2", "NRST", "PB11", "PA0", "PC15", "PC13", "VBAT"],
  "stm32-black-pill": ["VBAT", "PC13", "NRST", "PB10", "3V3", "GND", "5V", "3V3_2", "GND_2", "5V_2", "PB9", "PA15", "PB12"],
  "raspberry-pi-pico": [...range("GP", 0, 22), "GP26", "GP27", "GP28", "GND", "GND_8", "VBUS", "VSYS", "3V3_EN", "3V3_OUT", "ADC_VREF", "RUN"],
}

describe("Velxio-derived board geometry", () => {
  it.each(velxioBoards)("%s: pins are Velxio's coordinates mapped through the board layout", (type) => {
    const layout = getVelxioBoardLayout(type)!
    const definition = getComponentDefinition(type)!
    expect(layout).toBeDefined()
    expect(definition.width).toBe(layout.width)
    expect(definition.height).toBe(layout.height)
    const data = VELXIO_BOARD_DATA[type]
    expect(definition.pinTemplates).toHaveLength(data.pins.length)
    data.pins.forEach((raw, i) => {
      const expected = layout.toBoard(raw.x, raw.y)
      expect(definition.pinTemplates[i].name).toBe(raw.name)
      expect(definition.pinTemplates[i].x).toBeCloseTo(expected.x, 1)
      expect(definition.pinTemplates[i].y).toBeCloseTo(expected.y, 1)
    })
  })

  it.each(Object.keys(previousPinNames))("%s: keeps every pin name that existed before (saved wires keep working)", (type) => {
    const names = new Set(getComponentDefinition(type)!.pinTemplates.map((pin) => pin.name))
    expect(previousPinNames[type].filter((name) => !names.has(name))).toEqual([])
  })

  it("keeps Arduino Nano header pins on the real 2.54 mm pitch", () => {
    const layout = getVelxioBoardLayout("arduino-nano")!
    const byName = Object.fromEntries(getComponentDefinition("arduino-nano")!.pinTemplates.map((pin) => [pin.name, pin]))
    expect(Math.abs(byName["D11"].y - byName["D12"].y)).toBeCloseTo(2.54 * MM_PX * layout.scale, 1)
    expect(Math.abs(byName["A1"].y - byName["A0"].y)).toBeCloseTo(2.54 * MM_PX * layout.scale, 1)
  })

  it("places the Mega's 2x18 header (D22-D53) as a two-row block across the board end, not in the side columns", () => {
    const layout = getVelxioBoardLayout("arduino-mega")!
    const pins = Object.fromEntries(getComponentDefinition("arduino-mega")!.pinTemplates.map((pin) => [pin.name, pin]))
    const pitch = 2.54 * MM_PX * layout.scale
    // D22 and D52 are the first and last pins of one row: 15 pitches apart along the header...
    expect(Math.abs(pins["D52"].x - pins["D22"].x)).toBeCloseTo(15 * pitch, 0)
    // ...and the two rows are 10 native px apart, which is the spacing Wokwi uses for this header.
    expect(Math.abs(pins["D23"].y - pins["D22"].y)).toBeCloseTo(10 * layout.scale, 1)
    expect(pins["D22"].y).toBeCloseTo(pins["D52"].y, 1)
  })

  it("orients the ESP32 DevKit like the previous build: GND/23/22... along the top, 3V3/EN... along the bottom", () => {
    const pins = Object.fromEntries(getComponentDefinition("esp32-devkit")!.pinTemplates.map((pin) => [pin.name, pin]))
    const { height } = getComponentDefinition("esp32-devkit")!
    expect(pins["IO23"].y).toBeLessThan(height / 2)
    expect(pins["IO22"].x).toBeGreaterThan(pins["IO23"].x)
    expect(pins["3V3"].y).toBeGreaterThan(height / 2)
    expect(pins["RST"].x).toBeGreaterThan(pins["3V3"].x)
  })

  it("exposes the Uno pins the old hand-drawn board lacked", () => {
    const names = getComponentDefinition("arduino-uno")!.pinTemplates.map((pin) => pin.name)
    for (const name of ["AREF", "IOREF", "RESET", "SCL", "SDA", "GND3"]) expect(names).toContain(name)
  })
})
