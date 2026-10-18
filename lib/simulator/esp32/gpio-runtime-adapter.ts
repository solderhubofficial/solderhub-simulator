import {
  parseEsp32BridgeMessage,
  type Esp32BridgeMessage,
} from "./bridge-protocol"
import {
  applyEsp32GpioLevel,
  type Esp32DigitalLevel,
  type Esp32BoardType,
} from "./gpio-canvas-adapter"

export interface Esp32GpioRuntimeAdapterOptions {
  boardType: Esp32BoardType
  initialPinValues?: Record<string, number>
  onPinValues: (pinValues: Record<string, number>) => void
  onMessage?: (message: Esp32BridgeMessage) => void
}

/**
 * Stateful, transport-agnostic adapter for messages from a trusted ESP32
 * emulator worker. The caller remains responsible for checking message source
 * and origin before calling consume(). Invalid messages and GPIOs that are not
 * exposed by the selected board are ignored.
 *
 * This is deliberately not a window message listener: no current production
 * emulator transport is wired to the SolderHub bridge contract yet.
 */
export function createEsp32GpioRuntimeAdapter(options: Esp32GpioRuntimeAdapterOptions) {
  let pinValues = { ...(options.initialPinValues ?? {}) }

  return {
    consume(value: unknown): boolean {
      const message = parseEsp32BridgeMessage(value)
      if (!message) return false

      if (message.type === "gpio") {
        const next = applyEsp32GpioLevel(
          options.boardType,
          pinValues,
          message.pin,
          message.level as Esp32DigitalLevel,
        )
        if (!next) return false

        const changed = Object.keys(next).some((key) => next[key] !== pinValues[key])
        if (changed) {
          pinValues = next
          options.onPinValues({ ...pinValues })
        }
      }

      options.onMessage?.(message)
      return true
    },

    getPinValues(): Record<string, number> {
      return { ...pinValues }
    },

    reset(nextPinValues: Record<string, number> = {}): void {
      pinValues = { ...nextPinValues }
      options.onPinValues({ ...pinValues })
    },
  }
}
