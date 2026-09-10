/**
 * Registry for the real-hardware ESP Flasher (see app/flasher and
 * hooks/simulator/use-esp-flasher.ts).
 *
 * This is deliberately the same "flat array + helper" shape as
 * lib/simulator/firmware/projects.ts, but for *real* binaries flashed over
 * Web Serial rather than .hex files run in the in-browser AVR emulator.
 *
 * Two ways firmware gets onto a device here:
 *  1. `CUSTOM_BINARY_OPTION` -- the user uploads their own .bin (built with
 *     Arduino IDE / PlatformIO / ESP-IDF). This always works and needs
 *     nothing from us; it's the default and only option needed to make the
 *     flasher immediately useful, since the simulator's own compile route
 *     only targets AVR today (no ESP32/Xtensa toolchain -- see
 *     app/api/compile/route.ts).
 *  2. Entries in `FIRMWARE_LIBRARY` -- optional, hosted example binaries
 *     (e.g. a "Blink" or "WiFi scan" reference build for the ESP32 DevKit
 *     component) fetched by URL at flash time. Add an entry here the same
 *     way blink.ts is registered in projects.ts; nothing else needs to
 *     change for it to show up in the dropdown.
 */

export type FlasherChipTarget = "ESP32" | "ESP32-S2" | "ESP32-S3" | "ESP32-C3" | "ESP32-C6" | "ESP8266"

export interface FirmwareLibraryEntry {
  id: string
  name: string
  version: string
  /** Chip family this build was compiled for -- must match the connected chip. */
  target: FlasherChipTarget
  description: string
  /** Flash offset for this image, e.g. 0x10000 for an app partition, 0x0 for a full merged binary. */
  flashAddress: number
  /** URL to fetch the raw .bin from (same-origin or CORS-enabled). */
  url: string
}

export const CUSTOM_BINARY_OPTION = "__custom__" as const

/**
 * No hosted examples ship out of the box -- this is where they go once
 * we're building/hosting real ESP32 reference binaries. Left empty rather
 * than filled with placeholders that don't actually flash anything.
 */
export const FIRMWARE_LIBRARY: FirmwareLibraryEntry[] = []

export function getFirmwareLibraryEntry(id: string | null | undefined): FirmwareLibraryEntry | undefined {
  if (!id) return undefined
  return FIRMWARE_LIBRARY.find((f) => f.id === id)
}

export const DEFAULT_BAUD_RATE = 921_600

export const BAUD_RATE_OPTIONS = [115_200, 230_400, 460_800, 921_600] as const
