import { describe, expect, it } from "vitest"
import { mapEsp32BoardPinToGpio } from "./board-adapter"

describe("mapEsp32BoardPinToGpio", () => {
  it("maps classic ESP32 DevKit IO labels to chip GPIO numbers", () => {
    expect(mapEsp32BoardPinToGpio("esp32-devkit", "IO23")).toMatchObject({
      boardType: "esp32-devkit",
      pinLabel: "IO23",
      gpio: 23,
      inputOnly: false,
      bootStrapping: false,
      warning: null,
    })
  })

  it("maps the classic ESP32 analog-only header aliases", () => {
    expect(mapEsp32BoardPinToGpio("esp32-devkit", "SVP")).toMatchObject({
      gpio: 36,
      inputOnly: true,
    })
    expect(mapEsp32BoardPinToGpio("esp32-devkit", "SVN")).toMatchObject({
      gpio: 39,
      inputOnly: true,
    })
  })

  it("warns for input-only and boot-strapping pins", () => {
    expect(mapEsp32BoardPinToGpio("esp32-devkit", "IO34")).toMatchObject({
      gpio: 34,
      inputOnly: true,
      warning: expect.stringContaining("input-only"),
    })
    expect(mapEsp32BoardPinToGpio("esp32-devkit", "IO0")).toMatchObject({
      gpio: 0,
      bootStrapping: true,
      warning: expect.stringContaining("boot-strapping"),
    })
  })

  it("maps ESP32-C3 labels and its boot-strapping pins", () => {
    expect(mapEsp32BoardPinToGpio("esp32-c3", "GPIO19")).toMatchObject({
      boardType: "esp32-c3",
      gpio: 19,
      inputOnly: false,
      bootStrapping: false,
      warning: null,
    })
    expect(mapEsp32BoardPinToGpio("esp32-c3", "GPIO2")).toMatchObject({
      gpio: 2,
      bootStrapping: true,
      warning: expect.stringContaining("boot-strapping"),
    })
  })

  it("does not treat power, reset, flash-bus, or absent pins as GPIOs", () => {
    expect(mapEsp32BoardPinToGpio("esp32-devkit", "3V3")).toBeNull()
    expect(mapEsp32BoardPinToGpio("esp32-devkit", "RST")).toBeNull()
    expect(mapEsp32BoardPinToGpio("esp32-devkit", "SD1")).toBeNull()
    expect(mapEsp32BoardPinToGpio("esp32-c3", "GPIO11")).toBeNull()
    expect(mapEsp32BoardPinToGpio("esp32-devkit", "GPIO23")).toBeNull()
  })

  it("rejects unknown board types and malformed labels", () => {
    expect(mapEsp32BoardPinToGpio("esp32-devkit", "IO-1")).toBeNull()
  })
})
