/**
 * Helpers for the IDE-style "Output" console: turning arduino-cli output and
 * the (simulated) avrdude upload into display lines.
 */

export type LogLevel = "info" | "command" | "success" | "warning" | "error" | "dim"

export interface LogLine {
  id: number
  level: LogLevel
  text: string
  /** 1-based sketch line number parsed from `sketch.ino:LINE:COL:` diagnostics, if present. */
  sourceLine?: number
}

/** Counts the payload bytes in an Intel HEX image (data records only). */
export function hexByteCount(hex: string): number {
  let total = 0
  for (const line of hex.split(/\r?\n/)) {
    if (!line.startsWith(":")) continue
    if (parseInt(line.slice(7, 9), 16) !== 0x00) continue
    total += parseInt(line.slice(1, 3), 16)
  }
  return total
}

const DIAGNOSTIC = /\.ino:(\d+):(\d+):/

/** Classifies a raw compiler line so the console can colour it. */
export function classifyCompilerLine(text: string): { level: LogLevel; sourceLine?: number } {
  const match = DIAGNOSTIC.exec(text)
  const sourceLine = match ? Number(match[1]) : undefined
  if (/\berror\b:|fatal error:|^exit status|Error during build|^collect2:|undefined reference/i.test(text)) return { level: "error", sourceLine }
  if (/\bwarning\b:/i.test(text)) return { level: "warning", sourceLine }
  if (/^(Sketch uses|Global variables use)/.test(text)) return { level: "success" }
  if (/^(Used (library|platform)|\s+\S+\s+\d+\.\d+)/.test(text)) return { level: "dim" }
  if (/^\s+\^|^\s*\d+\s*\|/.test(text) || /^\s+\|/.test(text)) return { level: "dim" }
  return { level: "info", sourceLine }
}

/** The text avrdude prints for an Uno, sized to the real image. Each entry is shown as a separate console line. */
export function buildUploadScript(bytes: number): { text: string; level: LogLevel; delay: number }[] {
  const bar = "#".repeat(50)
  return [
    { text: "Uploading to Arduino Uno on simulated port (SIM0)…", level: "command", delay: 250 },
    { text: "avrdude: AVR device initialized and ready to accept instructions", level: "info", delay: 350 },
    { text: "avrdude: Device signature = 0x1e950f (probably m328p)", level: "info", delay: 200 },
    { text: `avrdude: reading input file "sketch.ino.hex"`, level: "info", delay: 200 },
    { text: `avrdude: writing flash (${bytes} bytes):`, level: "info", delay: 250 },
    { text: `Writing | ${bar} | 100% ${(0.02 + bytes / 9000).toFixed(2)}s`, level: "dim", delay: 650 },
    { text: `avrdude: ${bytes} bytes of flash written`, level: "info", delay: 200 },
    { text: `avrdude: verifying flash memory against sketch.ino.hex:`, level: "info", delay: 250 },
    { text: `Reading | ${bar} | 100% ${(0.015 + bytes / 12000).toFixed(2)}s`, level: "dim", delay: 550 },
    { text: `avrdude: ${bytes} bytes of flash verified`, level: "info", delay: 200 },
    { text: "avrdude done.  Thank you.", level: "info", delay: 250 },
    { text: "Done uploading.", level: "success", delay: 100 },
  ]
}
