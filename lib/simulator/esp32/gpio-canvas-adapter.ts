import { VELXIO_BOARD_DATA } from "@/lib/simulator/velxio-boards/velxio-board-data"
import { mapEsp32BoardPinToGpio, type Esp32BoardType } from "./board-adapter"

export type Esp32DigitalLevel = 0 | 1

/**
 * Translate a chip GPIO number into the actual pin label used by SolderHub's
 * board artwork and circuit model. GPIOs not exposed by the selected board
 * intentionally return null.
 */
export function mapEsp32GpioToHeaderPin(boardType: Esp32BoardType, gpio: number): string | null {
  if (!Number.isInteger(gpio) || gpio < 0 || gpio > 48) return null
  const board = VELXIO_BOARD_DATA[boardType]
  if (!board) return null

  for (const pin of board.pins) {
    const mapping = mapEsp32BoardPinToGpio(boardType, pin.name)
    if (mapping?.gpio === gpio) return pin.name
  }
  return null
}

/** Apply a validated GPIO level while preserving unrelated pin metadata. */
export function applyEsp32GpioLevel(
  boardType: Esp32BoardType,
  currentPinValues: Record<string, number>,
  gpio: number,
  level: Esp32DigitalLevel,
): Record<string, number> | null {
  if (level !== 0 && level !== 1) return null
  const pinName = mapEsp32GpioToHeaderPin(boardType, gpio)
  if (!pinName) return null
  return { ...currentPinValues, [pinName]: level }
}
