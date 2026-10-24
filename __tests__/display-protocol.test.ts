import { describe, expect, it } from "vitest"
import { createLcd1602I2cDecoder, createSsd1306Decoder } from "@/lib/simulator/engine/display-protocol"

describe("I2C display protocol decoders", () => {
  it("decodes PCF8574 LCD expander nibbles into 16x2 text", () => {
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
  it("decodes SSD1306 page framebuffer data", () => {
    const decoder = createSsd1306Decoder()
    decoder.beginTransaction?.()
    decoder.consume(0x40)
    let result: Record<string, unknown> | null = null
    for (let i = 0; i < 16; i++) result = decoder.consume(i === 0 ? 0x81 : 0)
    expect(result).toBeTruthy()
    expect((result?.framebuffer as number[])[0]).toBe(0x81)
  })
  it("recognizes SSD1306 display-off commands", () => {
    const decoder = createSsd1306Decoder()
    decoder.beginTransaction?.()
    decoder.consume(0x00)
    expect(decoder.consume(0xae)).toMatchObject({ displayOn: false })
  })
})
