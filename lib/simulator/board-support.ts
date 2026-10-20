/**
 * What a board can actually do in this simulator. One honest source of truth for the palette and the
 * code editor, so a board that is only artwork is never presented as runnable.
 *
 * - `runtime`: user code compiles and runs (Arduino Uno via avr8js, ESP32 via the browser emulator).
 * - `preview`: design and demo only. The board can be placed and wired, and curated demo projects can
 *   show behaviour, but there is no compiler or emulator, so user code does not run on it.
 */
export type BoardSupport = "runtime" | "preview"

export interface BoardSupportInfo {
  support: BoardSupport
  /** Short name used in messages. */
  label: string
  /** Why it is preview-only, in user-facing words. Present only for `preview`. */
  note?: string
}

const PREVIEW_NOTE = "can be placed and wired, but code can't be compiled or run on it yet. Only curated demo projects can show it working."

const BOARDS: Record<string, BoardSupportInfo> = {
  "arduino-uno": { support: "runtime", label: "Arduino Uno" },
  "esp32-devkit": { support: "runtime", label: "ESP32 DevKit" },
  "esp32-c3": { support: "runtime", label: "ESP32-C3" },
  "arduino-nano": { support: "preview", label: "Arduino Nano", note: PREVIEW_NOTE },
  "arduino-mega": { support: "preview", label: "Arduino Mega", note: PREVIEW_NOTE },
  "nodemcu-esp8266": { support: "preview", label: "NodeMCU ESP8266", note: PREVIEW_NOTE },
  "stm32-blue-pill": { support: "preview", label: "STM32 Blue Pill", note: PREVIEW_NOTE },
  "stm32-black-pill": { support: "preview", label: "STM32 Black Pill", note: PREVIEW_NOTE },
  "raspberry-pi-pico": { support: "preview", label: "Raspberry Pi Pico", note: PREVIEW_NOTE },
  "raspberry-pi-5": { support: "preview", label: "Raspberry Pi 5", note: PREVIEW_NOTE },
}

export function getBoardSupport(type: string | null | undefined): BoardSupportInfo | null {
  if (!type) return null
  return Object.prototype.hasOwnProperty.call(BOARDS, type) ? BOARDS[type] : null
}

export function isPreviewBoard(type: string | null | undefined): boolean {
  return getBoardSupport(type)?.support === "preview"
}

/** First preview-only board in a list of placed components, for editor messaging. */
export function findPreviewBoard(components: ReadonlyArray<{ type: string }>): BoardSupportInfo | null {
  for (const component of components) {
    const info = getBoardSupport(component.type)
    if (info?.support === "preview") return info
  }
  return null
}
