import { describe, expect, it } from "vitest"
import { applyEsp32GpioLevel, mapEsp32GpioToHeaderPin } from "./gpio-canvas-adapter"

describe("mapEsp32GpioToHeaderPin", () => {
  it("maps classic ESP32 GPIO2 to the actual canvas header label", () => {
    expect(mapEsp32GpioToHeaderPin("esp32-devkit", 2)).toBe("IO2")
  })

  it("maps ESP32-C3 GPIO labels using the selected board artwork", () => {
    expect(mapEsp32GpioToHeaderPin("esp32-c3", 19)).toBe("GPIO19")
  })

  it("rejects pins not exposed on the selected board", () => {
    expect(mapEsp32GpioToHeaderPin("esp32-devkit", 6)).toBeNull()
    expect(mapEsp32GpioToHeaderPin("esp32-c3", 11)).toBeNull()
    expect(mapEsp32GpioToHeaderPin("esp32-devkit", -1)).toBeNull()
    expect(mapEsp32GpioToHeaderPin("esp32-devkit", 2.5)).toBeNull()
  })
})

describe("applyEsp32GpioLevel", () => {
  it("updates the mapped pin while preserving unrelated pin values", () => {
    expect(applyEsp32GpioLevel("esp32-devkit", { IO2: 0, IO4: 1 }, 2, 1)).toEqual({
      IO2: 1,
      IO4: 1,
    })
  })

  it("does not mutate the original pin-value object", () => {
    const current = { IO2: 0 }
    const updated = applyEsp32GpioLevel("esp32-devkit", current, 2, 1)
    expect(current).toEqual({ IO2: 0 })
    expect(updated).toEqual({ IO2: 1 })
  })

  it("fails closed for invalid levels and unmapped GPIOs", () => {
    expect(applyEsp32GpioLevel("esp32-devkit", {}, 2, 2 as 0 | 1)).toBeNull()
    expect(applyEsp32GpioLevel("esp32-devkit", {}, 6, 1)).toBeNull()
  })
})
