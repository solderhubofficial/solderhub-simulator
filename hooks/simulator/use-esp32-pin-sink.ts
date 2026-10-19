"use client"

import { useCallback, useEffect, useRef } from "react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import type { Esp32BoardType } from "@/lib/simulator/esp32/board-adapter"
import { createEsp32GpioRuntimeAdapter } from "@/lib/simulator/esp32/gpio-runtime-adapter"

export interface Esp32PinSinkOptions {
  /** ID of the placed ESP32 board whose pin metadata drives the circuit. */
  boardComponentId: string
  boardType: Esp32BoardType
  /** While true the firmware owns the board's pins. Turning it off (or unmounting) restores the prior pin state. */
  active: boolean
}

/**
 * The single place where firmware GPIO becomes circuit state. It wraps the existing GPIO runtime adapter
 * (header mapping, 3.3 V logic and OUTPUT-mode handling live there and in the engine) and writes only
 * `pinModes` / `pinValues` on the board. Updates are `transient`, so firmware pin changes never enter the
 * undo history. Used by both the Worker runner and the iframe bridge runner.
 *
 * Returns `consume(message)`: feed it validated-or-not bridge messages; invalid ones and GPIOs that are not
 * exposed on the selected board are ignored (never mapped to a different pin).
 */
export function useEsp32PinSink({ boardComponentId, boardType, active }: Esp32PinSinkOptions) {
  const { state, dispatch } = useSimulator()
  const stateRef = useRef(state)
  stateRef.current = state
  const adapterRef = useRef<ReturnType<typeof createEsp32GpioRuntimeAdapter> | null>(null)

  useEffect(() => {
    if (!active) return
    const board = stateRef.current.components.find((c) => c.id === boardComponentId)
    if (!board) return
    const originalPinModes = (board.metadata.pinModes ?? {}) as Record<string, string>
    const originalPinValues = (board.metadata.pinValues ?? {}) as Record<string, number>

    // Real firmware owns the pins once it runs: start from a clean slate rather than inheriting the
    // component preview's default (e.g. IO2 HIGH).
    const adapter = createEsp32GpioRuntimeAdapter({
      boardType,
      onPinValues: () => {},
      onPinState: ({ pinModes, pinValues }) => {
        dispatch({ type: "UPDATE_METADATA", id: boardComponentId, metadata: { pinModes, pinValues }, transient: true })
      },
    })
    adapterRef.current = adapter
    adapter.reset()

    return () => {
      adapterRef.current = null
      dispatch({
        type: "UPDATE_METADATA",
        id: boardComponentId,
        metadata: { pinModes: originalPinModes, pinValues: originalPinValues },
        transient: true,
      })
    }
  }, [active, boardComponentId, boardType, dispatch])

  return useCallback((value: unknown): boolean => adapterRef.current?.consume(value) ?? false, [])
}
