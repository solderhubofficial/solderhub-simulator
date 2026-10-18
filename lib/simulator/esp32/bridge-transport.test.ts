import { describe, expect, it } from "vitest"
import { ESP32_BRIDGE_CHANNEL } from "./bridge-protocol"
import { parseTrustedEsp32BridgeEvent } from "./bridge-transport"

const expectedOrigin = "https://simulator.solderhub.com"
const source = {} as MessageEventSource
const data = {
  channel: ESP32_BRIDGE_CHANNEL,
  version: 1,
  type: "gpio",
  pin: 2,
  level: 1,
}
const event = (overrides: Partial<MessageEvent<unknown>> = {}) => ({
  origin: expectedOrigin,
  source,
  data,
  ...overrides,
})

describe("parseTrustedEsp32BridgeEvent", () => {
  it("accepts a valid message from the expected iframe and origin", () => {
    expect(parseTrustedEsp32BridgeEvent(event(), source, expectedOrigin)).toEqual(data)
  })

  it("rejects messages from a different origin", () => {
    expect(parseTrustedEsp32BridgeEvent(event({ origin: "https://attacker.example" }), source, expectedOrigin)).toBeNull()
  })

  it("rejects messages from a different window even when the origin matches", () => {
    expect(parseTrustedEsp32BridgeEvent(event({ source: {} as MessageEventSource }), source, expectedOrigin)).toBeNull()
  })

  it("rejects wildcard or empty expected origins", () => {
    expect(parseTrustedEsp32BridgeEvent(event(), source, "*")).toBeNull()
    expect(parseTrustedEsp32BridgeEvent(event(), source, "")).toBeNull()
  })

  it("rejects missing iframe sources and invalid payloads", () => {
    expect(parseTrustedEsp32BridgeEvent(event(), null, expectedOrigin)).toBeNull()
    expect(parseTrustedEsp32BridgeEvent(event({ data: { ...data, pin: 99 } }), source, expectedOrigin)).toBeNull()
  })
})
