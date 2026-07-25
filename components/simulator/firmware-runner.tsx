"use client"

import { useEffect, useRef } from "react"
import { useAvrRunner } from "@/hooks/simulator/use-avr-runner"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"

export interface ActiveFirmware {
  componentId: string
  hex: string
}

/**
 * Bridges a running avr8js CPU to a specific placed Arduino component.
 * Live pin values from the real firmware are written into that
 * component's `metadata.pinValues`, which `simulateArduino` already reads
 * for any pin whose `pinModes` is "OUTPUT" — so no changes to the
 * simulation engine are needed to make the rest of the circuit (LEDs,
 * onboard "L" LED, etc.) react to real compiled code.
 */
export function FirmwareRunner({ firmware }: { firmware: ActiveFirmware | null }) {
  const { state, dispatch } = useSimulator()
  const pins = useAvrRunner(firmware?.hex ?? null, state.isRunning)
  const lastAppliedRef = useRef<string>("")

  const componentExists = firmware
    ? state.components.some((c) => c.id === firmware.componentId)
    : false

  useEffect(() => {
    if (!firmware || !componentExists) return
    const serialized = JSON.stringify(pins)
    if (serialized === lastAppliedRef.current) return
    lastAppliedRef.current = serialized

    const numericValues: Record<string, number> = {}
    for (const [name, high] of Object.entries(pins)) {
      numericValues[name] = high ? 1 : 0
    }

    const target = state.components.find((c) => c.id === firmware.componentId)
    const existingPinValues = (target?.metadata.pinValues ?? {}) as Record<string, number>

    dispatch({
      type: "UPDATE_METADATA",
      id: firmware.componentId,
      metadata: { pinValues: { ...existingPinValues, ...numericValues } },
    })
    // Only re-run when the live pin snapshot changes (guarded above) or the
    // target component swaps out — not on every unrelated state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, firmware, componentExists])

  return null
}
