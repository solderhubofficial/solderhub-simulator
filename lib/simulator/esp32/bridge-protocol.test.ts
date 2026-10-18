import { describe, expect, it } from "vitest"
import {
  createEsp32GpioInput,
  ESP32_BRIDGE_CHANNEL,
  ESP32_MAX_SERIAL_CHARS,
  parseEsp32BridgeMessage,
} from "./bridge-protocol"

const message = (payload: Record<string, unknown>) => ({
  channel: ESP32_BRIDGE_CHANNEL,
  version: 1,
  ...payload,
})

describe("parseEsp32BridgeMessage", () => {
  it("accepts supported chip readiness", () => {
    expect(parseEsp32BridgeMessage(message({ type: "ready", chip: "esp32-s3" }))).toEqual(
      message({ type: "ready", chip: "esp32-s3" }),
    )
  })

  it("rejects unknown chips and protocol versions", () => {
    expect(parseEsp32BridgeMessage(message({ type: "ready", chip: "esp32-p4" }))).toBeNull()
    expect(parseEsp32BridgeMessage({ ...message({ type: "ready", chip: "esp32" }), version: 2 })).toBeNull()
  })

  it("accepts valid GPIO edges and rejects invalid pin/level values", () => {
    expect(parseEsp32BridgeMessage(message({ type: "gpio", pin: 21, level: 1 }))).toEqual(
      message({ type: "gpio", pin: 21, level: 1 }),
    )
    expect(parseEsp32BridgeMessage(message({ type: "gpio", pin: -1, level: 1 }))).toBeNull()
    expect(parseEsp32BridgeMessage(message({ type: "gpio", pin: 49, level: 0 }))).toBeNull()
    expect(parseEsp32BridgeMessage(message({ type: "gpio", pin: 2, level: true }))).toBeNull()
  })

  it("bounds serial output and restricts serial ports", () => {
    expect(parseEsp32BridgeMessage(message({ type: "serial", port: "uart0", data: "hello" }))).not.toBeNull()
    expect(parseEsp32BridgeMessage(message({ type: "serial", port: "telnet", data: "hello" }))).toBeNull()
    expect(parseEsp32BridgeMessage(message({ type: "serial", port: "usb", data: "x".repeat(ESP32_MAX_SERIAL_CHARS + 1) }))).toBeNull()
  })

  it("rejects arbitrary objects, unknown message types and oversized status detail", () => {
    expect(parseEsp32BridgeMessage(null)).toBeNull()
    expect(parseEsp32BridgeMessage([])).toBeNull()
    expect(parseEsp32BridgeMessage(message({ type: "eval", code: "1+1" }))).toBeNull()
    expect(parseEsp32BridgeMessage(message({ type: "status", state: "running", detail: "x".repeat(501) }))).toBeNull()
  })
})

describe("createEsp32GpioInput", () => {
  it("builds a validated GPIO input event", () => {
    expect(createEsp32GpioInput(4, 0)).toEqual(message({ type: "gpio", pin: 4, level: 0 }))
    expect(createEsp32GpioInput(4.5, 1)).toBeNull()
    expect(createEsp32GpioInput(4, 2 as 0 | 1)).toBeNull()
  })
})
