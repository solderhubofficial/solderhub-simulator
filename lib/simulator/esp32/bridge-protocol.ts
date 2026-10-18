/**
 * Versioned message contract for the future same-origin esp32sim adapter.
 *
 * This file intentionally does not attach a window message listener: the
 * currently embedded upstream page is cross-origin and does not implement
 * this contract. A listener becomes safe/useful only after a pinned, audited
 * emulator build explicitly emits these messages.
 */

export const ESP32_BRIDGE_CHANNEL = "solderhub:esp32-bridge" as const
export const ESP32_BRIDGE_VERSION = 1 as const
export const ESP32_MAX_PIN = 48
export const ESP32_MAX_SERIAL_CHARS = 16_384

export type Esp32BridgeMessage =
  | { channel: typeof ESP32_BRIDGE_CHANNEL; version: 1; type: "ready"; chip: "esp32" | "esp32-s3" | "esp32-c3" | "esp32-c6" }
  | { channel: typeof ESP32_BRIDGE_CHANNEL; version: 1; type: "gpio"; pin: number; level: 0 | 1 }
  | { channel: typeof ESP32_BRIDGE_CHANNEL; version: 1; type: "serial"; port: "uart0" | "uart1" | "usb"; data: string }
  | { channel: typeof ESP32_BRIDGE_CHANNEL; version: 1; type: "status"; state: "booting" | "running" | "stopped" | "error"; detail?: string }

const CHIPS = new Set(["esp32", "esp32-s3", "esp32-c3", "esp32-c6"])
const SERIAL_PORTS = new Set(["uart0", "uart1", "usb"])
const STATES = new Set(["booting", "running", "stopped", "error"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Parse and validate a bridge message. Unknown versions/types fail closed. */
export function parseEsp32BridgeMessage(value: unknown): Esp32BridgeMessage | null {
  if (!isRecord(value)) return null
  if (value.channel !== ESP32_BRIDGE_CHANNEL || value.version !== ESP32_BRIDGE_VERSION) return null

  switch (value.type) {
    case "ready":
      if (typeof value.chip !== "string" || !CHIPS.has(value.chip)) return null
      return { channel: ESP32_BRIDGE_CHANNEL, version: 1, type: "ready", chip: value.chip as "esp32" | "esp32-s3" | "esp32-c3" | "esp32-c6" }

    case "gpio":
      if (!Number.isInteger(value.pin) || (value.pin as number) < 0 || (value.pin as number) > ESP32_MAX_PIN) return null
      if (value.level !== 0 && value.level !== 1) return null
      return { channel: ESP32_BRIDGE_CHANNEL, version: 1, type: "gpio", pin: value.pin as number, level: value.level }

    case "serial":
      if (typeof value.port !== "string" || !SERIAL_PORTS.has(value.port)) return null
      if (typeof value.data !== "string" || value.data.length > ESP32_MAX_SERIAL_CHARS) return null
      return { channel: ESP32_BRIDGE_CHANNEL, version: 1, type: "serial", port: value.port as "uart0" | "uart1" | "usb", data: value.data }

    case "status":
      if (typeof value.state !== "string" || !STATES.has(value.state)) return null
      if (value.detail !== undefined && (typeof value.detail !== "string" || value.detail.length > 500)) return null
      return value.detail === undefined
        ? { channel: ESP32_BRIDGE_CHANNEL, version: 1, type: "status", state: value.state as "booting" | "running" | "stopped" | "error" }
        : { channel: ESP32_BRIDGE_CHANNEL, version: 1, type: "status", state: value.state as "booting" | "running" | "stopped" | "error", detail: value.detail as string }

    default:
      return null
  }
}

/**
 * Validate a parent-originated GPIO input before translating it to the
 * emulator's own protocol. Callers must ALSO validate event.origin and
 * event.source; payload validation is not an origin check.
 */
export function createEsp32GpioInput(pin: number, level: 0 | 1): Esp32BridgeMessage | null {
  if (!Number.isInteger(pin) || pin < 0 || pin > ESP32_MAX_PIN || (level !== 0 && level !== 1)) return null
  return { channel: ESP32_BRIDGE_CHANNEL, version: 1, type: "gpio", pin, level }
}
