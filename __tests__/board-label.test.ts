import { describe, expect, it } from "vitest"
import { describeBoard } from "@/lib/simulator/board-label"

describe("describeBoard", () => {
  it("says there is no board on an empty canvas or with only passive parts", () => {
    expect(describeBoard([])).toBe("No board")
    expect(describeBoard([{ type: "led" }, { type: "resistor" }])).toBe("No board")
  })

  it("identifies an Arduino Uno as AVR", () => {
    expect(describeBoard([{ type: "arduino-uno" }, { type: "led" }])).toBe("AVR")
  })

  it("identifies an ESP32 DevKit as ESP32 (not AVR)", () => {
    expect(describeBoard([{ type: "esp32-devkit" }])).toBe("ESP32")
  })

  it("reports both when both boards are placed", () => {
    expect(describeBoard([{ type: "arduino-uno" }, { type: "esp32-devkit" }])).toBe("ESP32 + AVR")
  })
})
