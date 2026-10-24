"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** Same list the Arduino IDE offers. */
export const BAUD_RATES = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 500000, 1000000, 2000000] as const
export const DEFAULT_BAUD = 9600
const MAX_LINES = 1000

export type SerialLine = { id: number; time: number; text: string }

export const LINE_ENDINGS = [
  { id: "none", label: "No line ending", suffix: "" },
  { id: "nl", label: "Newline", suffix: "\n" },
  { id: "cr", label: "Carriage return", suffix: "\r" },
  { id: "both", label: "Both NL & CR", suffix: "\r\n" },
] as const
export type LineEndingId = (typeof LINE_ENDINGS)[number]["id"]

const GARBAGE = "ÿþýü�¿¡¤§¶╗▒░ÃÂÐð×÷"

/** What a real serial terminal shows when its baud rate doesn't match the sketch's `Serial.begin()`. */
function garble(text: string, seed: number): string {
  let out = ""
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === "\n" || ch === "\r") { out += ch; continue }
    out += GARBAGE[(ch.charCodeAt(0) * 31 + seed + i * 7) % GARBAGE.length]
  }
  return out
}

/** Snap the (slightly inexact) rate avr8js derives from UBRR to the nearest standard rate. */
function snapBaud(raw: number): number {
  let best: number = BAUD_RATES[0]
  for (const rate of BAUD_RATES) if (Math.abs(rate - raw) < Math.abs(best - raw)) best = rate
  return Math.abs(best - raw) / best <= 0.05 ? best : Math.round(raw)
}

/**
 * Owns everything the serial monitor shows. Lives high in the tree so output survives
 * opening/closing panels. The selected baud rate is a *display* setting, exactly like the
 * Arduino IDE: if it differs from the sketch's `Serial.begin()` rate, output is garbled.
 */
export function useSerialLog() {
  const [lines, setLines] = useState<SerialLine[]>([])
  const [partial, setPartial] = useState("")
  const [deviceBaud, setDeviceBaud] = useState<number | null>(null)
  const [selectedBaud, setSelectedBaudState] = useState<number>(DEFAULT_BAUD)

  const lineId = useRef(0)
  const partialRef = useRef("")
  const deviceBaudRef = useRef<number | null>(null)
  const selectedBaudRef = useRef<number>(DEFAULT_BAUD)
  const userSelectedBaudRef = useRef(false)
  const garbleCount = useRef(0)

  const setSelectedBaud = useCallback((rate: number) => {
    userSelectedBaudRef.current = true
    selectedBaudRef.current = rate
    setSelectedBaudState(rate)
  }, [])

  useEffect(() => {
    const onChunk = (event: Event) => {
      let chunk = (event as CustomEvent<string>).detail
      if (typeof chunk !== "string") return
      const mismatch = deviceBaudRef.current !== null && deviceBaudRef.current !== selectedBaudRef.current
      if (mismatch) chunk = garble(chunk, garbleCount.current++)
      const parts = (partialRef.current + chunk).replace(/\r\n?/g, "\n").split("\n")
      const rest = (parts.pop() ?? "").slice(-2000)
      partialRef.current = rest
      setPartial(rest)
      if (parts.length > 0) {
        const now = Date.now()
        setLines((existing) => [...existing, ...parts.map((text) => ({ id: lineId.current++, time: now, text }))].slice(-MAX_LINES))
      }
    }
    const onConfig = (event: Event) => {
      const detail = (event as CustomEvent<{ baudRate?: number | null }>).detail
      const next = typeof detail?.baudRate === "number" && detail.baudRate > 0 ? snapBaud(detail.baudRate) : null
      deviceBaudRef.current = next
      setDeviceBaud(next)
      // Start with readable output by matching the first detected sketch baud.
      // Once the user chooses a baud manually, preserve that choice like a real terminal.
      if (next !== null && !userSelectedBaudRef.current) {
        selectedBaudRef.current = next
        setSelectedBaudState(next)
      }
    }
    window.addEventListener("simulator:serial-chunk", onChunk)
    window.addEventListener("simulator:serial-config", onConfig)
    return () => {
      window.removeEventListener("simulator:serial-chunk", onChunk)
      window.removeEventListener("simulator:serial-config", onConfig)
    }
  }, [])

  const clear = useCallback(() => {
    partialRef.current = ""
    setPartial("")
    setLines([])
  }, [])

  const send = useCallback((text: string, ending: LineEndingId) => {
    const suffix = LINE_ENDINGS.find((e) => e.id === ending)?.suffix ?? ""
    window.dispatchEvent(new CustomEvent("simulator:serial-input", { detail: text + suffix }))
  }, [])

  return { lines, partial, deviceBaud, selectedBaud, setSelectedBaud, clear, send }
}

export type SerialLog = ReturnType<typeof useSerialLog>
