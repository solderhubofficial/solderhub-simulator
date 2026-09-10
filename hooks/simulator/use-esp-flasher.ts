"use client"

import { useCallback, useRef, useState } from "react"
import { ESPLoader, Transport, type IEspLoaderTerminal } from "esptool-js"
import type { FlasherChipTarget } from "@/lib/simulator/flasher/firmware-library"

export type FlasherPhase = "idle" | "connecting" | "connected" | "erasing" | "flashing" | "done" | "error"

export interface FlasherLogLine {
  id: number
  text: string
}

interface FlashJob {
  /** Raw firmware bytes to write. */
  data: Uint8Array
  /** Flash offset, e.g. 0x10000 for an app image or 0x0 for a full merged binary. */
  address: number
}

/**
 * Detects, connects to, and flashes a real ESP32-family board over the Web
 * Serial API using esptool-js (the same library ESP Web Tools / the
 * official esptool.py project ship for browser-based flashing).
 *
 * This talks to physical hardware over USB -- it is unrelated to the
 * in-browser avr8js CPU emulator used elsewhere in the simulator
 * (see hooks/simulator/use-avr-runner.ts), which only ever simulates an
 * ATmega328P and never touches a real device.
 */
export function useEspFlasher(baudRate: number) {
  const [phase, setPhase] = useState<FlasherPhase>("idle")
  const [logs, setLogs] = useState<FlasherLogLine[]>([])
  const [chipDescription, setChipDescription] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)

  const transportRef = useRef<Transport | null>(null)
  const loaderRef = useRef<ESPLoader | null>(null)
  const logIdRef = useRef(0)

  const pushLog = useCallback((text: string) => {
    logIdRef.current += 1
    setLogs((prev) => [...prev.slice(-499), { id: logIdRef.current, text }])
  }, [])

  const terminal: IEspLoaderTerminal = {
    clean: () => setLogs([]),
    writeLine: (data: string) => pushLog(data),
    write: (data: string) => pushLog(data),
  }

  const isSupported = typeof window !== "undefined" && "serial" in navigator

  const connect = useCallback(async () => {
    if (!isSupported) {
      pushLog("This browser doesn't support Web Serial. Use Chrome or Edge on desktop.")
      setPhase("error")
      return
    }
    try {
      setPhase("connecting")
      pushLog("Requesting serial port…")
      const port = await navigator.serial.requestPort()
      const transport = new Transport(port, true)
      const loader = new ESPLoader({ transport, baudrate: baudRate, terminal })
      const description = await loader.main()
      transportRef.current = transport
      loaderRef.current = loader
      setChipDescription(description)
      setPhase("connected")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.toLowerCase().includes("no port selected")) {
        pushLog("Port selection cancelled.")
      } else {
        pushLog(`Connection failed: ${message}`)
      }
      setPhase(transportRef.current ? "connected" : "idle")
    }
    // baudRate/terminal intentionally excluded -- terminal is a stable
    // shape recreated each render but connect() only needs it at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, pushLog])

  const disconnect = useCallback(async () => {
    try {
      await transportRef.current?.disconnect()
    } catch {
      // best-effort -- device may already be gone
    }
    transportRef.current = null
    loaderRef.current = null
    setChipDescription(null)
    setProgress(0)
    setPhase("idle")
  }, [])

  const eraseFlash = useCallback(async () => {
    const loader = loaderRef.current
    if (!loader) return
    try {
      setPhase("erasing")
      pushLog("Erasing flash — this can take a minute…")
      await loader.eraseFlash()
      pushLog("Flash erased.")
      setPhase("connected")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushLog(`Erase failed: ${message}`)
      setPhase("error")
    }
  }, [pushLog])

  const flash = useCallback(
    async (job: FlashJob) => {
      const loader = loaderRef.current
      if (!loader) return
      try {
        setPhase("flashing")
        setProgress(0)
        pushLog("Starting flash…")
        await loader.writeFlash({
          fileArray: [{ data: job.data, address: job.address }],
          flashMode: "keep",
          flashFreq: "keep",
          flashSize: "keep",
          eraseAll: false,
          compress: true,
          reportProgress: (_fileIndex, written, total) => {
            setProgress(total > 0 ? Math.round((written / total) * 100) : 0)
          },
        })
        pushLog("Flash complete. Resetting device…")
        await loader.after("hard_reset")
        setPhase("done")
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        pushLog(`Flash failed: ${message}`)
        setPhase("error")
      }
    },
    [pushLog],
  )

  const clearLogs = useCallback(() => setLogs([]), [])

  return {
    isSupported,
    phase,
    logs,
    chipDescription,
    chipTarget: chipDescriptionToTarget(chipDescription),
    progress,
    connect,
    disconnect,
    eraseFlash,
    flash,
    clearLogs,
  }
}

function chipDescriptionToTarget(description: string | null): FlasherChipTarget | null {
  if (!description) return null
  const upper = description.toUpperCase()
  if (upper.includes("ESP32-S3")) return "ESP32-S3"
  if (upper.includes("ESP32-S2")) return "ESP32-S2"
  if (upper.includes("ESP32-C6")) return "ESP32-C6"
  if (upper.includes("ESP32-C3")) return "ESP32-C3"
  if (upper.includes("ESP8266")) return "ESP8266"
  if (upper.includes("ESP32")) return "ESP32"
  return null
}
