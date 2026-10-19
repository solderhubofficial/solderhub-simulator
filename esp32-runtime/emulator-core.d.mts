export declare const LOAD_KIND: { readonly ROM: 0; readonly BOOTLOADER: 1; readonly PARTITIONS: 2; readonly APP: 3 }
export declare const ROM_FILES: { readonly esp32: string; readonly esp32s3: string; readonly esp32c3: string; readonly esp32c6: string }
export type EmulatorChip = keyof typeof ROM_FILES

export type EmulatorErrorCode =
  | "unsupported_chip"
  | "instantiate_failed"
  | "create_failed"
  | "load_failed"
  | "boot_failed"
  | "run_failed"
  | "disposed"

export declare class EmulatorError extends Error {
  code: EmulatorErrorCode
  logs: string[]
  constructor(code: EmulatorErrorCode, message: string, logs?: string[])
}

export type EmulatorEvent = { t: "gpio"; pin: number; level: 0 | 1 } | { t: "serial"; data: string }

export interface EmulatorCoreOptions {
  wasm: BufferSource | WebAssembly.Module
  chip: EmulatorChip
  images: { rom: Uint8Array; bootloader: Uint8Array; partitions: Uint8Array; app: Uint8Array }
  flashMb?: number
  enableJit?: boolean
  onLog?: (line: string) => void
}

export interface EmulatorCore {
  chip: EmulatorChip
  cpuHz: number
  cycles(): number
  logs(): string[]
  jitStats(): Record<string, number>
  run(cycles: number, unixMs?: number): { stop: number; events: EmulatorEvent[] }
  dispose(): void
}

export declare function createEmulatorCore(options: EmulatorCoreOptions): Promise<EmulatorCore>
export declare function parseSha256Sums(text: string): Record<string, string>
export declare function sha256Hex(bytes: Uint8Array): Promise<string>
