import type { Esp32BoardType } from "./board-adapter"
import { FQBN_BY_BOARD } from "@/esp32-build-service/compile-shared.mjs"

/** Chips that have a SolderHub board component. */
export type Esp32Chip = "esp32" | "esp32c3"

/**
 * - `supported`: the full path (compile -> emulator -> GPIO -> canvas LED) is covered by the browser
 *   acceptance test in CI for this exact target.
 * - `experimental`: the pieces exist and the headless emulator test passes, but the browser acceptance
 *   test does not cover this target. The UI labels it as such.
 * - `unsupported`: the UI refuses to compile or run and explains why.
 */
export type Esp32TargetStatus = "supported" | "experimental" | "unsupported"

export interface Esp32Target {
  boardType: Esp32BoardType
  label: string
  chip: Esp32Chip
  fqbn: string
  status: Esp32TargetStatus
  /** Shown next to the board and in the console when it is not `supported`. */
  statusNote: string
  /**
   * GPIO the Arduino core's `LED_BUILTIN` resolves to for this FQBN, or null when it is not
   * confirmed. The DevKitC-V4 artwork has no user LED, so wire an external LED to this pin.
   * Confirmed values are recorded in docs/esp32-firmware-integration.md with the CI evidence.
   */
  ledBuiltinGpio: number | null
}

const TARGETS: Record<Esp32BoardType, Esp32Target> = {
  "esp32-devkit": {
    boardType: "esp32-devkit",
    label: "ESP32 DevKit (ESP32-WROOM-32)",
    chip: "esp32",
    fqbn: FQBN_BY_BOARD["esp32-devkit"],
    status: "experimental",
    statusNote: "Compiles with the ESP32 Arduino core and runs in the browser emulator. GPIO output and serial output are bridged to the canvas; other peripherals (PWM, ADC, I2C, SPI, Wi-Fi) are not.",
    ledBuiltinGpio: null,
  },
  "esp32-c3": {
    boardType: "esp32-c3",
    label: "ESP32-C3 DevKitM-1",
    chip: "esp32c3",
    fqbn: FQBN_BY_BOARD["esp32-c3"],
    status: "experimental",
    statusNote: "The RISC-V ESP32-C3 emulator target passes the headless Blink test, but the browser workflow is not verified for it. Pin mappings differ from the classic ESP32.",
    ledBuiltinGpio: null,
  },
}

export function getEsp32Target(boardType: string | null | undefined): Esp32Target | null {
  if (!boardType) return null
  return Object.prototype.hasOwnProperty.call(TARGETS, boardType) ? TARGETS[boardType as Esp32BoardType] : null
}

export function isEsp32BoardType(value: unknown): value is Esp32BoardType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TARGETS, value)
}

/** Component types on the canvas that look like an ESP32-family board but have no verified target. */
export function describeUnsupportedEsp32Board(boardType: string): string | null {
  if (isEsp32BoardType(boardType)) return null
  if (/^esp32|^nodemcu/i.test(boardType)) {
    return `"${boardType}" has no verified ESP32 compile-and-run target yet. Supported targets: ${Object.values(TARGETS).map((t) => t.label).join(", ")}.`
  }
  return null
}

export function listEsp32Targets(): Esp32Target[] {
  return Object.values(TARGETS)
}
