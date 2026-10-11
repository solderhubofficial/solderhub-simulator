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
})
