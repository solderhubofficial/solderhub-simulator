"use client"

import { useEffect, useMemo, useRef } from "react"
import { useAvrRunner } from "@/hooks/simulator/use-avr-runner"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { createLcd1602I2cDecoder, createSsd1306Decoder, createLcd1602ParallelDecoder } from "@/lib/simulator/engine/display-protocol"
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


  const lcdDecoderRef = useRef(new Map<string, ReturnType<typeof createLcd1602I2cDecoder> | ReturnType<typeof createSsd1306Decoder>>())
  const parallelDecoderRef = useRef(new Map<string, ReturnType<typeof createLcd1602ParallelDecoder>>())
  const previousParallelPinsRef = useRef<Record<string, string>>({})
  useEffect(() => {
    if (!firmware || !componentExists) return
    const onConnect = (event: Event) => {
      const detail = (event as CustomEvent<{ address: number; write: boolean }>).detail
      if (!detail?.write) return
      for (const target of state.components) {
        const address = target.type === "lcd1602" ? Number(target.metadata.i2cAddress ?? 0x27)
          : target.type === "oled-13" ? Number(target.metadata.i2cAddress ?? 0x3c) : -1
        if (address !== detail.address) continue
        let decoder = lcdDecoderRef.current.get(target.id)
        if (!decoder) {
          decoder = target.type === "lcd1602" ? createLcd1602I2cDecoder() : createSsd1306Decoder()
          lcdDecoderRef.current.set(target.id, decoder)
        }
        decoder.beginTransaction?.()
      }
    }
    const onByte = (event: Event) => {
      const detail = (event as CustomEvent<{ address: number; write: boolean; value: number }>).detail
      if (!detail?.write) return
      const targets = state.components.filter((c) => (c.type === "lcd1602" && Number(c.metadata.i2cAddress ?? 0x27) === detail.address) || (c.type === "oled-13" && Number(c.metadata.i2cAddress ?? 0x3c) === detail.address))
      for (const target of targets) {
        let decoder = lcdDecoderRef.current.get(target.id)
        if (!decoder) {
          decoder = target.type === "lcd1602" ? createLcd1602I2cDecoder() : createSsd1306Decoder()
          lcdDecoderRef.current.set(target.id, decoder)
        }
        const patch = decoder.consume(detail.value)
        if (patch) dispatch({ type: "UPDATE_METADATA", id: target.id, metadata: patch, transient: true })
      }
    }
    window.addEventListener("simulator:i2c-connect", onConnect)
    window.addEventListener("simulator:i2c-byte", onByte)
    return () => { window.removeEventListener("simulator:i2c-connect", onConnect); window.removeEventListener("simulator:i2c-byte", onByte) }
  }, [firmware, componentExists, state.components, dispatch])


  // Parallel HD44780 LCD: sample the live AVR GPIO levels connected directly
  // to RS/E/D4-D7 and latch each nibble on the falling edge of E.
  useEffect(() => {
    if (!firmware || !componentExists) return
    const board = state.components.find((c) => c.id === firmware.componentId)
    if (!board) return
    const previous = previousParallelPinsRef.current
    for (const target of state.components.filter((c) => c.type === "lcd1602-parallel")) {
      const def = getComponentDefinition(target.type)
      if (!def) continue
      const displayPins = instantiatePins(target.id, def.pinTemplates)
      const levels: Record<string, boolean> = {}
      for (const pin of displayPins) {
        if (!["RS", "E", "D4", "D5", "D6", "D7"].includes(pin.name)) continue
        const wire = state.wires.find((w) =>
          (w.fromComponentId === target.id && w.fromPinId === pin.id && w.toComponentId === board.id) ||
          (w.toComponentId === target.id && w.toPinId === pin.id && w.fromComponentId === board.id)
        )
        if (!wire) { levels[pin.name] = false; continue }
        const boardPinId = wire.fromComponentId === board.id ? wire.fromPinId : wire.toPinId
        const boardPinName = boardPinId.slice(board.id.length + 1)
        levels[pin.name] = pins[boardPinName] === true
      }
      let decoder = parallelDecoderRef.current.get(target.id)
      if (!decoder) {
        decoder = createLcd1602ParallelDecoder()
        parallelDecoderRef.current.set(target.id, decoder)
      }
      const snapshot = JSON.stringify(levels)
      if (snapshot === previous[target.id]) continue
      previous[target.id] = snapshot
      const patch = decoder.sample(levels)
      if (patch) dispatch({ type: "UPDATE_METADATA", id: target.id, metadata: patch, transient: true })
    }
    previousParallelPinsRef.current = previous
  }, [pins, firmware, componentExists, state.components, state.wires, dispatch])

  return null
}
