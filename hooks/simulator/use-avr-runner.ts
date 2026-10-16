"use client"

import { useEffect, useRef, useState } from "react"
import { CPU, avrInstruction, AVRIOPort, AVRUSART, usart0Config, portBConfig, portCConfig, portDConfig } from "avr8js"
import { loadIntelHex } from "@/lib/simulator/firmware/hex-loader"

const FLASH_WORDS = 0x8000 // 32K words = 64KB, plenty for an ATmega328P image
const CPU_FREQUENCY_HZ = 16_000_000
/** Clamp the per-frame catch-up so a backgrounded tab doesn't cause a huge burst of instructions on return. */
const MAX_FRAME_SECONDS = 0.1

// Standard Arduino Uno port→pin mapping.
const PORTB_PINS = ["D8", "D9", "D10", "D11", "D12", "D13"] // bits 0-5
const PORTC_PINS = ["A0", "A1", "A2", "A3", "A4", "A5"] // bits 0-5
const PORTD_PINS = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7"] // bits 0-7

function portValueToPins(value: number, names: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  names.forEach((name, bit) => {
    out[name] = ((value >> bit) & 1) === 1
  })
  return out
}

/**
 * Runs a real, compiled AVR hex image on an emulated ATmega328P (via
 * avr8js) and reports the live digital pin states, keyed by Arduino Uno pin
 * name (D0-D13, A0-A5). The CPU only advances while `running` is true, so
 * it stays in lockstep with the simulator's own Run/Stop control.
 */
export function useAvrRunner(hex: string | null, running: boolean, uploadId = 0) {
  const [pins, setPins] = useState<Record<string, boolean>>({})
  const runningRef = useRef(running)
  runningRef.current = running

  useEffect(() => {
    if (!hex) return

    const progMem = new Uint16Array(FLASH_WORDS)
    const progBytes = new Uint8Array(progMem.buffer)
    loadIntelHex(hex, progBytes)

    const cpu = new CPU(progMem)
    const portB = new AVRIOPort(cpu, portBConfig)
    const portC = new AVRIOPort(cpu, portCConfig)
    const portD = new AVRIOPort(cpu, portDConfig)
    const usart = new AVRUSART(cpu, usart0Config, CPU_FREQUENCY_HZ)
    const serialInputQueue: number[] = []

    const dispatchSerialEvent = (name: string, detail: unknown) => {
      window.dispatchEvent(new CustomEvent(name, { detail }))
    }

    let transmitLine = ""
    usart.onByteTransmit = (value) => {
      const character = String.fromCharCode(value)
      dispatchSerialEvent("simulator:serial-chunk", character)
      if (character === "\n") {
        dispatchSerialEvent("simulator:serial-output", transmitLine.replace(/\r$/, ""))
        transmitLine = ""
      } else {
        transmitLine += character
      }
    }
    // Only report a rate once the sketch has called Serial.begin() (UART enabled); before that
    // UBRR is 0 and avr8js would otherwise report a meaningless 1,000,000 baud.
    usart.onConfigurationChange = () => {
      const active = usart.txEnable || usart.rxEnable
      dispatchSerialEvent("simulator:serial-config", { baudRate: active ? usart.baudRate : null })
    }
    dispatchSerialEvent("simulator:serial-config", { baudRate: null })

    const deliverNextSerialByte = () => {
      const nextByte = serialInputQueue.shift()
      if (nextByte === undefined) return
      if (!usart.writeByte(nextByte)) serialInputQueue.length = 0
    }
    usart.onRxComplete = deliverNextSerialByte
    const handleSerialInput = (event: Event) => {
      // The serial monitor appends the selected line ending itself, so send the bytes as-is.
      const text = (event as CustomEvent<string>).detail
      if (typeof text !== "string") return
      const wasEmpty = serialInputQueue.length === 0
      serialInputQueue.push(...Array.from(new TextEncoder().encode(text)))
      if (wasEmpty && !usart.rxBusy) deliverNextSerialByte()
    }
    window.addEventListener("simulator:serial-input", handleSerialInput)

    const applyPortChange = (names: string[]) => (value: number) => {
      setPins((prev) => ({ ...prev, ...portValueToPins(value, names) }))
    }
    portB.addListener(applyPortChange(PORTB_PINS))
    portC.addListener(applyPortChange(PORTC_PINS))
    portD.addListener(applyPortChange(PORTD_PINS))

    let frameId: number
    let lastTime: number | null = null
    let stopped = false

    const loop = (time: number) => {
      if (stopped) return
      if (lastTime === null) lastTime = time
      const dt = Math.min((time - lastTime) / 1000, MAX_FRAME_SECONDS)
      lastTime = time

      if (runningRef.current) {
        const targetCycles = cpu.cycles + dt * CPU_FREQUENCY_HZ
        while (cpu.cycles < targetCycles) {
          avrInstruction(cpu)
          cpu.tick()
        }
      }
      frameId = requestAnimationFrame(loop)
    }

    frameId = requestAnimationFrame(loop)
    return () => {
      stopped = true
      cancelAnimationFrame(frameId)
      window.removeEventListener("simulator:serial-input", handleSerialInput)
      dispatchSerialEvent("simulator:serial-config", { baudRate: null })
    }
  }, [hex, uploadId])

  return pins
}
