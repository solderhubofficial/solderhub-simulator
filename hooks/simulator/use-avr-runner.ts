"use client"

import { useEffect, useRef, useState } from "react"
import { CPU, avrInstruction, AVRIOPort, portBConfig, portCConfig, portDConfig } from "avr8js"
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
export function useAvrRunner(hex: string | null, running: boolean) {
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
    }
  }, [hex])

  return pins
}
