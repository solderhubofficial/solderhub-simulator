import { VELXIO_BOARD_DATA } from "@/lib/simulator/velxio-boards/velxio-board-data"

export type Esp32BoardType = "esp32-devkit" | "esp32-c3"

export interface Esp32BoardGpioMapping {
  boardType: Esp32BoardType
  pinLabel: string
  gpio: number
  inputOnly: boolean
  bootStrapping: boolean
  warning: string | null
}

const CLASSIC_ESP32_INPUT_ONLY = new Set([34, 35, 36, 39])
const CLASSIC_ESP32_STRAPPING = new Set([0, 2, 5, 12, 15])
const ESP32_C3_STRAPPING = new Set([2, 8, 9])

function gpioNumberForLabel(boardType: Esp32BoardType, pinLabel: string): number | null {
  const label = pinLabel.trim().toUpperCase()
  if (boardType === "esp32-devkit") {
    if (label === "SVP") return 36
    if (label === "SVN") return 39
  }

  const match = /^(?:IO|GPIO)(\d+)$/.exec(label)
  if (!match) return null
  const gpio = Number(match[1])
  if (!Number.isInteger(gpio) || gpio < 0 || gpio > 48) return null
  return gpio
}

/**
 * Translate an actual SolderHub board header label to a chip GPIO number.
 * Power, ground, reset, flash-bus, and other non-GPIO pins intentionally
 * return null. Only labels present on the selected board artwork are accepted.
 */
export function mapEsp32BoardPinToGpio(
  boardType: Esp32BoardType,
  pinLabel: string,
): Esp32BoardGpioMapping | null {
  const board = VELXIO_BOARD_DATA[boardType]
  if (!board || typeof pinLabel !== "string") return null

  const normalizedLabel = pinLabel.trim().toUpperCase()
  const boardPin = board.pins.find((pin) => pin.name.toUpperCase() === normalizedLabel)
  if (!boardPin) return null

  const gpio = gpioNumberForLabel(boardType, normalizedLabel)
  if (gpio === null) return null

  const inputOnly = boardType === "esp32-devkit" && CLASSIC_ESP32_INPUT_ONLY.has(gpio)
  const bootStrapping = boardType === "esp32-devkit"
    ? CLASSIC_ESP32_STRAPPING.has(gpio)
    : ESP32_C3_STRAPPING.has(gpio)

  let warning: string | null = null
  if (inputOnly) {
    warning = `GPIO${gpio} is input-only on the classic ESP32; output/PWM is not supported on this pin.`
  } else if (bootStrapping) {
    warning = `GPIO${gpio} is a boot-strapping pin; external circuitry can affect startup.`
  }

  return { boardType, pinLabel: boardPin.name, gpio, inputOnly, bootStrapping, warning }
}
