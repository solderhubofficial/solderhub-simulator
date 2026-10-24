"use client"

import { useEffect, useRef } from "react"
import { useMemo } from "react"
import { useAvrRunner, type AvrEchoSensor } from "@/hooks/simulator/use-avr-runner"
import { resolveHcSr04Links } from "@/lib/simulator/avr/hc-sr04-link"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"

export interface ActiveFirmware {
  componentId: string
  hex: string
  /** Bump to restart the CPU even when the hex is identical (re-upload of an unchanged sketch). */
  uploadId?: number
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
  const sensors = useMemo<AvrEchoSensor[]>(() => {
    if (!firmware) return []
    return resolveHcSr04Links(state.components, state.wires, firmware.componentId).map((link) => {
      const component = state.components.find((c) => c.id === link.componentId)
      const raw = component?.metadata.distanceCm
      return { ...link, distanceCm: typeof raw === "number" ? raw : 100 }
    })
  }, [firmware, state.components, state.wires])
  const { pins, pwm } = useAvrRunner(firmware?.hex ?? null, state.isRunning, firmware?.uploadId ?? 0, sensors)
  const lastAppliedRef = useRef<string>("")

  const componentExists = firmware
    ? state.components.some((c) => c.id === firmware.componentId)
    : false

  useEffect(() => {
    if (!firmware || !componentExists) return
    const serialized = JSON.stringify([pins, pwm])
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
      metadata: { pinValues: { ...existingPinValues, ...numericValues }, pwm },
    })
    // Only re-run when the live pin snapshot changes (guarded above) or the
    // target component swaps out — not on every unrelated state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, pwm, firmware, componentExists])

  return null
}
