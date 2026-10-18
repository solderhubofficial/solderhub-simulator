import { VELXIO_BOARD_DATA } from "@/lib/simulator/velxio-boards/velxio-board-data"
import { mapEsp32BoardPinToGpio, type Esp32BoardType } from "./board-adapter"

export type Esp32DigitalLevel = 0 | 1

/**
 * Convert a validated chip GPIO level into SolderHub's board-header pin key.
 *
 * The circuit engine reads metadata.pinValues by the board's actual pin label
 * (for example, IO2 on the classic DevKit), not by raw chip GPIO number.
 * Returns null for GPIOs that are not exposed on this board's artwork.
 */
export function mapEsp32GpioToHeaderPin(
  boardType: Esp32BoardType,
  gpio: number,
): string | null {
  if (!Number.isInteger(gpio) || gpio < 0 || gpio > 48) return null

  const board = VELXIO_BOARD_DATA[boardType]
  if (!board) return null

  for (const pin of board.pins) {
    const mapping = mapEsp32BoardPinToGpio(boardType, pin.name)
    if (mapping?.gpio === gpio) return pin.name
  }

  return null
}

/**
 * Pure state adapter for a future trusted emulator GPIO event. The caller
 * must validate iframe source/origin and the bridge message before invoking.
 * Existing pin values are preserved so unrelated circuit metadata is intact.
 */
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
