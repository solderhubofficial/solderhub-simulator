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


describe("authentic board artwork anchor calibration", () => {
  it("keeps Arduino Nano pin rows on the rotated SVG's 2.54 mm hole pitch", () => {
    const definition = getComponentDefinition("arduino-nano")
    expect(definition).toBeDefined()
    const left = definition!.pinTemplates.filter((pin) => pin.x < definition!.width / 2)
    const right = definition!.pinTemplates.filter((pin) => pin.x > definition!.width / 2)
    expect(left[0].y).toBeCloseTo(24.3, 1)
    expect(right[0].y).toBeCloseTo(24.3, 1)
    expect(left[1].y - left[0].y).toBeCloseTo(13.24, 2)
    expect(right[1].y - right[0].y).toBeCloseTo(13.24, 2)
    expect(left[0].x).toBeCloseTo(6.6, 1)
    expect(right[0].x).toBeCloseTo(definition!.width - 6.6, 1)
  })

  it("keeps Arduino Mega pin rows calibrated to the rotated SVG scale", () => {
    const definition = getComponentDefinition("arduino-mega")
    expect(definition).toBeDefined()
    const left = definition!.pinTemplates.filter((pin) => pin.x < definition!.width / 2)
    const right = definition!.pinTemplates.filter((pin) => pin.x > definition!.width / 2)
    expect(left[0].y).toBeCloseTo(24.6, 1)
    expect(right[0].y).toBeCloseTo(24.6, 1)
    expect(left[1].y - left[0].y).toBeCloseTo(14.33, 2)
    expect(right[1].y - right[0].y).toBeCloseTo(14.33, 2)
    expect(left[0].x).toBeCloseTo(43, 1)
    expect(right[0].x).toBeCloseTo(definition!.width - 43, 1)
  })
})
