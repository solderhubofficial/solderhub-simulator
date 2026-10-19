import type { Esp32Artifacts } from "./compile-contract"
import type { Esp32Chip } from "./targets"

/**
 * Main thread -> emulator Worker commands. Worker -> main events reuse the versioned
 * `Esp32BridgeMessage` from bridge-protocol.ts (ready / gpio / serial / status) and are validated
 * with `parseEsp32BridgeMessage` on arrival; nothing else is accepted from the Worker.
 */
export type Esp32WorkerCommand =
  | {
      type: "start"
      chip: Esp32Chip
      /** Where esp32sim.wasm, SHA256SUMS and the ROM ELFs are served from (same-origin path or https URL). */
      assetBase: string
      artifacts: Esp32Artifacts
    }
  | { type: "stop" }

export type Esp32RuntimeState = "idle" | "starting" | "booting" | "running" | "stopped" | "error"

export interface Esp32RuntimeStatus {
  state: Esp32RuntimeState
  detail?: string
}

/** Only these chips are ever sent to the Worker; the controller refuses anything else. */
export const ESP32_RUNTIME_CHIPS: readonly Esp32Chip[] = ["esp32", "esp32c3"]

/** Limit what the Worker may be told to fetch: same-origin absolute path or an https URL. */
export function isValidAssetBase(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return !value.includes("..")
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password
  } catch {
    return false
  }
}

export const DEFAULT_ESP32_ASSET_BASE = "/esp32"

export function resolveAssetBase(configured: string | undefined): string {
  const base = (configured ?? "").trim().replace(/\/+$/, "")
  if (base && isValidAssetBase(base)) return base
  return DEFAULT_ESP32_ASSET_BASE
}

/** Human-readable explanation for each state, used by the editor and tests. */
export function describeRuntimeStatus(status: Esp32RuntimeStatus): string {
  switch (status.state) {
    case "idle": return "No firmware is running."
    case "starting": return "Starting the emulator…"
    case "booting": return "Booting the firmware…"
    case "running": return "Firmware is running."
    case "stopped": return "Firmware stopped."
    case "error": return status.detail ? `Emulator error: ${status.detail}` : "Emulator error."
  }
}
