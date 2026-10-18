import {
  parseEsp32BridgeMessage,
  type Esp32BridgeMessage,
} from "./bridge-protocol"
import {
  applyEsp32GpioLevel,
  mapEsp32GpioToHeaderPin,
  type Esp32DigitalLevel,
} from "./gpio-canvas-adapter"
import type { Esp32BoardType } from "./board-adapter"

export interface Esp32PinState {
  /** Header pin name -> "OUTPUT" for every pin the firmware has driven. */
  pinModes: Record<string, string>
  /** Header pin name -> 0 | 1. */
  pinValues: Record<string, number>
}

export interface Esp32GpioRuntimeAdapterOptions {
  boardType: Esp32BoardType
  initialPinValues?: Record<string, number>
  initialPinModes?: Record<string, string>
  onPinValues: (pinValues: Record<string, number>) => void
  /**
   * Fired once per change with both maps. The simulation engine only drives a
   * pin onto the circuit when its mode is "OUTPUT", so consumers that apply
   * firmware GPIO to the canvas must use this rather than `onPinValues` alone.
   */
  onPinState?: (state: Esp32PinState) => void
  onMessage?: (message: Esp32BridgeMessage) => void
}

/**
 * Stateful, transport-agnostic adapter for messages from a trusted ESP32
 * emulator worker. The caller remains responsible for checking message source
 * and origin before calling consume(). Invalid messages and GPIOs that are not
 * exposed by the selected board are ignored.
 *
 * A GPIO output event implies the firmware configured that pin as an output,
 * so the pin is also recorded with mode "OUTPUT".
 */
export function createEsp32GpioRuntimeAdapter(options: Esp32GpioRuntimeAdapterOptions) {
  let pinValues = { ...(options.initialPinValues ?? {}) }
  let pinModes = { ...(options.initialPinModes ?? {}) }

  const snapshot = (): Esp32PinState => ({ pinModes: { ...pinModes }, pinValues: { ...pinValues } })

  return {
    consume(value: unknown): boolean {
      const message = parseEsp32BridgeMessage(value)
      if (!message) return false

      if (message.type === "gpio") {
        const header = mapEsp32GpioToHeaderPin(options.boardType, message.pin)
        const next = applyEsp32GpioLevel(
          options.boardType,
          pinValues,
          message.pin,
          message.level as Esp32DigitalLevel,
        )
        if (!next || !header) return false

        const valuesChanged = Object.keys(next).some((key) => next[key] !== pinValues[key])
        const modeChanged = pinModes[header] !== "OUTPUT"
        if (valuesChanged) pinValues = next
        if (modeChanged) pinModes = { ...pinModes, [header]: "OUTPUT" }
        if (valuesChanged) options.onPinValues({ ...pinValues })
        if (valuesChanged || modeChanged) options.onPinState?.(snapshot())
      }

      options.onMessage?.(message)
      return true
    },

    getPinValues(): Record<string, number> {
      return { ...pinValues }
    },

    getPinState(): Esp32PinState {
      return snapshot()
    },

    reset(nextPinValues: Record<string, number> = {}, nextPinModes: Record<string, string> = {}): void {
      pinValues = { ...nextPinValues }
      pinModes = { ...nextPinModes }
      options.onPinValues({ ...pinValues })
      options.onPinState?.(snapshot())
    },
  }
}
