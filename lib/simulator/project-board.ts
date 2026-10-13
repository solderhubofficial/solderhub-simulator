/** Board-family detection for public/saved projects (filters + thumbnails). */

export type BoardFamily = "arduino" | "esp32" | "raspberry-pi" | "stm32" | "other"

export const BOARD_FAMILIES: { id: BoardFamily | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "arduino", label: "Arduino Uno" },
  { id: "esp32", label: "ESP32" },
  { id: "raspberry-pi", label: "Raspberry Pi" },
  { id: "stm32", label: "STM32" },
]

/** Component type shown as the thumbnail when only the family is known. */
export const FAMILY_THUMBNAIL_TYPE: Record<BoardFamily, string | null> = {
  arduino: "arduino-uno",
  esp32: "esp32-devkit",
  "raspberry-pi": "raspberry-pi-pico",
  stm32: "stm32-blue-pill",
  other: null,
}

export function familyOfType(type: string | null | undefined): BoardFamily {
  const t = (type ?? "").toLowerCase()
  if (!t) return "other"
  if (t.includes("arduino") || t.includes("uno") || t.includes("nano") || t.includes("mega")) return "arduino"
  if (t.includes("esp") || t.includes("nodemcu")) return "esp32"
  if (t.includes("raspberry") || t.includes("pico") || t.includes("rpi")) return "raspberry-pi"
  if (t.includes("stm32") || t.includes("pill")) return "stm32"
  return "other"
}

const BOARD_TYPES = /^(arduino-|esp32|nodemcu|stm32|raspberry-pi)/

/** Prefer the board actually placed in the circuit; fall back to the firmware target. */
export function boardTypeOf(components: unknown, firmwareTarget: string | null): string | null {
  if (Array.isArray(components)) {
    const board = components.find((c) => c && typeof (c as { type?: unknown }).type === "string" && BOARD_TYPES.test((c as { type: string }).type)) as { type: string } | undefined
    if (board) return board.type
  }
  return firmwareTarget
}
