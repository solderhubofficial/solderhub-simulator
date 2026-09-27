"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ESPLoader, Transport, type IEspLoaderTerminal } from "esptool-js"
import { BAUD_RATE_OPTIONS, type FlasherChipTarget } from "@/lib/simulator/flasher/firmware-library"

/**
 * Errors thrown by esptool-js right after a baud-rate change that mean the
 * adapter ack'd the new rate but couldn't actually hold it (garbled first
 * read). Overwhelmingly a CP210x (Silicon Labs, VID 0x10c4) issue at
 * 921600/460800 -- the chip is fine, just not reliable at that rate on this
 * cable/host. Worth a same-attempt retry at the next lower rate rather than
 * surfacing a dead end.
 */
function isBaudRelatedFailure(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes("invalid head of packet") || lower.includes("serial noise or corruption")
}

/** Candidate rates at or below `requested`, fastest first, deduped/sorted. */
function baudFallbackChain(requested: number): number[] {
  const rates = Array.from(new Set([requested, ...BAUD_RATE_OPTIONS])).filter((r) => r <= requested)
  return rates.sort((a, b) => b - a)
}

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
  const [portInfo, setPortInfo] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [bytesWritten, setBytesWritten] = useState<number>(0)
  const [bytesTotal, setBytesTotal] = useState<number>(0)

  const transportRef = useRef<Transport | null>(null)
  const loaderRef = useRef<ESPLoader | null>(null)
  const logIdRef = useRef(0)

  const pushLog = useCallback((text: string) => {
    const id = ++logIdRef.current
    setLogs((prev) => [...prev.slice(-499), { id, text }])
  }, [])

  const terminal: IEspLoaderTerminal = {
    clean: () => setLogs([]),
    writeLine: (data: string) => pushLog(data),
    write: (data: string) => pushLog(data),
  }

  const isSupported = typeof window !== "undefined" && "serial" in navigator

  // Release the port on unmount (route navigation, hot reload in dev, etc.)
  // so it isn't left open for the next connect attempt to collide with.
  useEffect(() => {
    return () => {
      void transportRef.current?.disconnect()
    }
  }, [])

  const connect = useCallback(async () => {
    if (!isSupported) {
      pushLog("This browser doesn't support Web Serial. Use Chrome or Edge on desktop.")
      setPhase("error")
      return
    }
    // Tracked locally (not via transportRef) until main() fully succeeds, so
    // that a mid-handshake failure -- which happens *after* the port is
    // already open -- can still release it. Leaving it open here is what
    // causes the next attempt's transport.connect() to fail with
    // "Failed to open serial port": the OS still sees the old one holding it.
    let openedTransport: Transport | null = null
    const chain = baudFallbackChain(baudRate)
    try {
      setPhase("connecting")
      pushLog("Requesting serial port…")
      const port = await navigator.serial.requestPort()

      let lastErr: unknown = null
      for (let i = 0; i < chain.length; i++) {
        const rate = chain[i]
        const transport = new Transport(port, true)
        openedTransport = transport
        try {
          if (i > 0) pushLog(`Retrying at ${rate.toLocaleString()} baud…`)
          const loader = new ESPLoader({ transport, baudrate: rate, terminal })
          const description = await loader.main()
          transportRef.current = transport
          loaderRef.current = loader
          setChipDescription(description)
          setPortInfo(transport.getInfo())
          if (rate !== baudRate) {
            pushLog(`Connected at ${rate.toLocaleString()} baud (adapter couldn't hold ${baudRate.toLocaleString()}).`)
          }
          setPhase("connected")
          lastErr = null
          break
        } catch (err) {
          lastErr = err
          const message = err instanceof Error ? err.message : String(err)
          try {
            await transport.disconnect()
          } catch {
            // best-effort -- next iteration reopens on the same port anyway
          }
          openedTransport = null
          const hasNextRate = i < chain.length - 1
          if (!hasNextRate || !isBaudRelatedFailure(message)) throw err
          pushLog(`Connection failed at ${rate.toLocaleString()} baud: ${message}`)
        }
      }
      if (lastErr) throw lastErr
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.toLowerCase().includes("no port selected")) {
        pushLog("Port selection cancelled.")
      } else {
        pushLog(`Connection failed: ${message}`)
        if (openedTransport) {
          try {
            await openedTransport.disconnect()
            pushLog("Released the serial port — try connecting again.")
          } catch {
            // best-effort -- if this also fails, the browser/OS still thinks
            // the port is busy; a physical unplug/replug clears it.
            pushLog("Couldn't release the port automatically. Unplug and replug the board if the next attempt also fails.")
          }
        }
      }
      transportRef.current = null
      loaderRef.current = null
      setPhase("idle")
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
    setPortInfo(null)
    setProgress(0)
    setBytesWritten(0)
    setBytesTotal(0)
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
      // Mid-transfer noise (dropped/garbled byte over a long write) is a
      // different failure mode than the baud-negotiation issue connect()
      // handles: the link already proved itself during handshake, so a
      // bounded same-baud retry is the right response rather than treating
      // it as fatal. Real cable/port problems will still exhaust the
      // retries and surface normally.
      const maxAttempts = 3
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const loader = loaderRef.current
        if (!loader) return
        try {
          setPhase("flashing")
          setProgress(0)
          setBytesWritten(0)
          setBytesTotal(job.data.byteLength)
          pushLog(attempt === 1 ? "Starting flash…" : `Retrying flash (attempt ${attempt}/${maxAttempts})…`)
          await loader.writeFlash({
            fileArray: [{ data: job.data, address: job.address }],
            flashMode: "keep",
            flashFreq: "keep",
            flashSize: "keep",
            eraseAll: false,
            compress: true,
            reportProgress: (_fileIndex, written, total) => {
              setProgress(total > 0 ? Math.round((written / total) * 100) : 0)
              setBytesWritten(written)
              setBytesTotal(total)
            },
          })
          pushLog("Flash complete. Resetting device…")
          await loader.after("hard_reset")
          setPhase("done")
          return
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const canRetry = attempt < maxAttempts && isBaudRelatedFailure(message)
          if (!canRetry) {
            pushLog(`Flash failed: ${message}`)
            setPhase("error")
            return
          }
          pushLog(`Flash write glitched: ${message}`)
        }
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
    portInfo,
    chipTarget: chipDescriptionToTarget(chipDescription),
    progress,
    bytesWritten,
    bytesTotal,
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
