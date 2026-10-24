import { describe, expect, it } from "vitest"
import { createLcd1602I2cDecoder } from "@/lib/simulator/engine/display-protocol"

describe("LCD1602 I2C decoder", () => {
  it("decodes a PCF8574 nibble pair into a character", () => {
    const decoder = createLcd1602I2cDecoder()
    const nibble = (n: number, rs: number) => {
      const b = (n << 4) | rs | 8
      decoder.consume(b | 4)
      return decoder.consume(b)
    }
    const byte = (b: number, rs: number) => { nibble(b >> 4, rs); return nibble(b & 15, rs) }
    byte(1, 0)
    expect(byte(0x48, 1)).toMatchObject({ line1: "H", line2: "", backlight: true })
  })
})
