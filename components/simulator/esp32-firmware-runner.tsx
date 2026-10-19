"use client"

import { useEffect, useRef } from "react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { useEsp32PinSink } from "@/hooks/simulator/use-esp32-pin-sink"
import type { Esp32BoardType } from "@/lib/simulator/esp32/board-adapter"
import type { Esp32Artifacts } from "@/lib/simulator/esp32/compile-contract"
import { createEsp32RuntimeController, type WorkerLike } from "@/lib/simulator/esp32/runtime-controller"
import { resolveAssetBase, type Esp32RuntimeStatus } from "@/lib/simulator/esp32/runtime-protocol"
import type { Esp32Chip } from "@/lib/simulator/esp32/targets"

export interface ActiveEsp32Firmware {
  /** ID of the placed ESP32 board the firmware runs on. */
  componentId: string
  boardType: Esp32BoardType
  chip: Esp32Chip
  artifacts: Esp32Artifacts
  /** The exact sketch these artifacts were compiled from (the editor compares it to detect stale builds). */
  source: string
  /** Bump to restart the emulator from power-on even when the artifacts are unchanged (Reset). */
  runId: number
}

const ASSET_BASE = resolveAssetBase(process.env.NEXT_PUBLIC_ESP32_RUNTIME_BASE_URL)

const IDLE: Esp32RuntimeStatus = { state: "idle" }

/**
 * Runs compiled ESP32 firmware in an isolated Web Worker while the simulator is running, and applies
 * its GPIO to the placed board so wired components (LEDs, ...) react. Stopping the simulation terminates
 * the Worker and restores the board's pin state; Reset (a new `runId`) boots the same firmware again.
 * Renders nothing; the editor shows the status it reports.
 */
export function Esp32FirmwareRunner({
  firmware,
  onStatus,
}: {
  firmware: ActiveEsp32Firmware | null
  onStatus: (status: Esp32RuntimeStatus) => void
}) {
  const { state, dispatch } = useSimulator()
  const onStatusRef = useRef(onStatus)
  onStatusRef.current = onStatus
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch
  const lastStateRef = useRef<Esp32RuntimeStatus["state"]>("idle")
  const report = (status: Esp32RuntimeStatus) => {
    lastStateRef.current = status.state
    onStatusRef.current(status)
    // A failed emulator must not leave the simulator claiming firmware is running.
    if (status.state === "error") dispatchRef.current({ type: "SET_RUNNING", isRunning: false })
  }
  const reportRef = useRef(report)
  reportRef.current = report

  const boardExists = firmware ? state.components.some((c) => c.id === firmware.componentId && c.type === firmware.boardType) : false
  const running = Boolean(firmware) && boardExists && state.isRunning

  const consume = useEsp32PinSink({
    boardComponentId: firmware?.componentId ?? "",
    boardType: firmware?.boardType ?? "esp32-devkit",
    active: running,
  })
  const consumeRef = useRef(consume)
  consumeRef.current = consume
  // Read through a ref so recompiling while the emulator runs does not silently restart it:
  // the new build takes effect on the next Run or Reset (runId).
  const firmwareRef = useRef(firmware)
  firmwareRef.current = firmware

  useEffect(() => {
    const firmware = firmwareRef.current
    if (!running || !firmware) {
      // Keep the last "stopped"/"error" status visible; only a cleared firmware returns to idle.
      if (!firmware && lastStateRef.current !== "idle") reportRef.current(IDLE)
      return
    }
    const dispatchSerial = (name: string, detail: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }))
    // The emulator does not report the UART baud rate; null keeps the monitor from garbling the text.
    dispatchSerial("simulator:serial-config", { baudRate: null })

    const controller = createEsp32RuntimeController({
      createWorker: () =>
        new Worker(new URL("../../lib/simulator/esp32/emulator.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike,
      onStatus: (status) => reportRef.current(status),
      onMessage: (message) => {
        if (message.type === "gpio") consumeRef.current(message)
        else if (message.type === "serial") dispatchSerial("simulator:serial-chunk", message.data)
      },
    })
    controller.start({ chip: firmware.chip, assetBase: ASSET_BASE, artifacts: firmware.artifacts })

    return () => {
      controller.stop()
      dispatchSerial("simulator:serial-config", { baudRate: null })
    }
    // Only starting, stopping or Reset (runId) restarts the emulator.
  }, [running, firmware?.runId, firmware === null]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
