"use client"

import { useEffect, useMemo, useRef } from "react"
import { useAvrRunner } from "@/hooks/simulator/use-avr-runner"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"

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
  const analogInputs = useMemo(() => {
    const board = firmware
      ? state.components.find((component) => component.id === firmware.componentId)
      : undefined
    if (!board) return {}
    const boardDefinition = getComponentDefinition(board.type)
    if (!boardDefinition) return {}
    const boardPins = instantiatePins(board.id, boardDefinition.pinTemplates)
    const inputs: Partial<Record<"A0" | "A1" | "A2" | "A3" | "A4" | "A5", number>> = {}

    for (let channel = 0; channel < 6; channel++) {
      const boardPinName = `A${channel}` as keyof typeof inputs
      const boardPin = boardPins.find((pin) => pin.name === boardPinName)
      if (!boardPin) continue
      const wire = state.wires.find((candidate) =>
        (candidate.fromComponentId === board.id && candidate.fromPinId === boardPin.id) ||
        (candidate.toComponentId === board.id && candidate.toPinId === boardPin.id)
      )
      if (!wire) continue
      const sourceId = wire.fromComponentId === board.id ? wire.toComponentId : wire.fromComponentId
      const sourcePinId = wire.fromComponentId === board.id ? wire.toPinId : wire.fromPinId
      const source = state.components.find((candidate) => candidate.id === sourceId)
      if (!source || source.type !== "potentiometer") continue
      const sourceDefinition = getComponentDefinition(source.type)
      if (!sourceDefinition) continue
      const sourcePins = instantiatePins(source.id, sourceDefinition.pinTemplates)
      const sourcePin = sourcePins.find((pin) => pin.id === sourcePinId)
      if (sourcePin?.name !== "wiper") continue
      const position = typeof source.metadata.position === "number"
        ? Math.min(1, Math.max(0, source.metadata.position))
        : 0.5
      inputs[boardPinName] = position * 5
    }
    return inputs
  }, [firmware?.componentId, state.components, state.wires])
  const { pins, pwm } = useAvrRunner(firmware?.hex ?? null, state.isRunning, firmware?.uploadId ?? 0, analogInputs)
  const lastAppliedRef = useRef<string>("")

  const componentExists = firmware
    ? state.components.some((c) => c.id === firmware.componentId)
    : false

  useEffect(() => {
    if (!firmware || !componentExists) return
    const serialized = JSON.stringify({ pins, pwm })
    if (serialized === lastAppliedRef.current) return
    lastAppliedRef.current = serialized

    const numericValues: Record<string, number> = {}
    for (const [name, high] of Object.entries(pins)) {
      numericValues[name] = high ? 1 : 0
    }

    const target = state.components.find((c) => c.id === firmware.componentId)
    const existingPinValues = (target?.metadata.pinValues ?? {}) as Record<string, number>

    const existingPwmValues = (target?.metadata.pwmValues ?? {}) as Record<string, unknown>

    dispatch({
      type: "UPDATE_METADATA",
      id: firmware.componentId,
      transient: true,
      metadata: {
        pinValues: { ...existingPinValues, ...numericValues },
        pwmValues: { ...existingPwmValues, ...pwm },
      },
    })
    // Only re-run when the live pin snapshot changes (guarded above) or the
    // target component swaps out — not on every unrelated state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, pwm, firmware, componentExists])

  return null
}
