import { describe, expect, it } from "vitest"
import { findPreviewBoard, getBoardSupport, isPreviewBoard } from "@/lib/simulator/board-support"
import { isEsp32BoardType } from "@/lib/simulator/esp32/targets"

describe("board support", () => {
  it("marks STM32 boards as preview-only with an honest note", () => {
    for (const type of ["stm32-blue-pill", "stm32-black-pill"]) {
      const info = getBoardSupport(type)
      expect(info?.support).toBe("preview")
      expect(info?.note).toMatch(/can't be compiled or run/)
    }
  })
  it("keeps runnable boards runnable and agrees with the ESP32 targets", () => {
    expect(getBoardSupport("arduino-uno")?.support).toBe("runtime")
    for (const type of ["esp32-devkit", "esp32-c3"]) {
      expect(isEsp32BoardType(type)).toBe(true)
      expect(getBoardSupport(type)?.support).toBe("runtime")
    }
  })
  it("finds the first preview board and ignores unknown types", () => {
    expect(findPreviewBoard([{ type: "led" }, { type: "stm32-blue-pill" }])?.label).toBe("STM32 Blue Pill")
    expect(findPreviewBoard([{ type: "led" }])).toBeNull()
    expect(isPreviewBoard("led")).toBe(false)
    expect(getBoardSupport(undefined)).toBeNull()
  })
})
