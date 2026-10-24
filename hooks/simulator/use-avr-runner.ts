"use client"

import { useEffect, useRef, useState } from "react"
import { CPU, avrInstruction, AVRIOPort, AVRTimer, AVRUSART, timer0Config, timer1Config, timer2Config, usart0Config, portBConfig, portCConfig, portDConfig } from "avr8js"
import { PwmTracker } from "@/lib/simulator/avr/pwm-tracker"
import { loadIntelHex } from "@/lib/simulator/firmware/hex-loader"
import { UNO_PIN_LOCATIONS } from "@/lib/simulator/avr/uno-pins"
import { HC_SR04_MIN_TRIGGER_US, HC_SR04_RESPONSE_DELAY_US, echoPulseMicroseconds } from "@/lib/simulator/avr/hc-sr04-link"

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
export interface AvrEchoSensor {
  componentId: string
  trigPin: string
  echoPin: string
  distanceCm: number
}

export interface AvrPwmReading {
  duty: number
  frequencyHz: number
}

export function useAvrRunner(hex: string | null, running: boolean, uploadId = 0, sensors: AvrEchoSensor[] = []) {
  const [pins, setPins] = useState<Record<string, boolean>>({})
  const [pwm, setPwm] = useState<Record<string, AvrPwmReading>>({})
  const runningRef = useRef(running)
  runningRef.current = running
  // Latest sensor settings, read at the moment a trigger pulse ends so a changed distance applies at once.
  const sensorsRef = useRef(sensors)
  sensorsRef.current = sensors

  useEffect(() => {
    if (!hex) return

    const progMem = new Uint16Array(FLASH_WORDS)
    const progBytes = new Uint8Array(progMem.buffer)
    loadIntelHex(hex, progBytes)

    const cpu = new CPU(progMem)
    const portB = new AVRIOPort(cpu, portBConfig)
    const portC = new AVRIOPort(cpu, portCConfig)
    const portD = new AVRIOPort(cpu, portDConfig)
    // Timers drive millis()/micros()/delay() and PWM; without them any sketch that calls delay() hangs.
    new AVRTimer(cpu, timer0Config)
    new AVRTimer(cpu, timer1Config)
    new AVRTimer(cpu, timer2Config)
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

    // Pin levels change thousands of times per second under PWM, so collect them here and publish once per frame.
    const liveLevels: Record<string, boolean> = {}
    const trackers = new Map<string, PwmTracker>()
    let levelsDirty = false
    let lastPwmKey = ""
    const applyPortChange = (names: string[]) => (value: number) => {
      const next = portValueToPins(value, names)
      for (const name of names) {
        if (liveLevels[name] === next[name]) continue
        liveLevels[name] = next[name]
        levelsDirty = true
        let tracker = trackers.get(name)
        if (!tracker) {
          tracker = new PwmTracker(CPU_FREQUENCY_HZ)
          trackers.set(name, tracker)
        }
        tracker.record(cpu.cycles, next[name])
      }
    }
    portB.addListener(applyPortChange(PORTB_PINS))
    portC.addListener(applyPortChange(PORTC_PINS))
    portD.addListener(applyPortChange(PORTD_PINS))

    const publish = () => {
      const readings: Record<string, AvrPwmReading> = {}
      for (const [name, tracker] of trackers) {
        const reading = tracker.sample(cpu.cycles)
        if (reading) readings[name] = { duty: Math.round(reading.duty * 100) / 100, frequencyHz: Math.round(reading.frequencyHz) }
      }
      const key = JSON.stringify(readings)
      if (key !== lastPwmKey) {
        lastPwmKey = key
        setPwm(readings)
      }
      if (levelsDirty) {
        levelsDirty = false
        setPins({ ...liveLevels })
      }
    }

    // HC-SR04: when TRIG goes high then low (>= ~10 µs), raise ECHO after the module's response delay for a width
    // proportional to the distance, driven into the ECHO pin in CPU time so pulseIn() measures a real distance.
    const ports = { B: portB, C: portC, D: portD }
    const triggerRise = new Map<string, number>()
    const watchTrigger = (portName: "B" | "C" | "D") => (value: number, oldValue: number) => {
      for (const sensor of sensorsRef.current) {
        const trig = UNO_PIN_LOCATIONS[sensor.trigPin]
        const echo = UNO_PIN_LOCATIONS[sensor.echoPin]
        if (!trig || !echo || trig.port !== portName) continue
        const now = (value >> trig.bit) & 1
        const before = (oldValue >> trig.bit) & 1
        if (now === before) continue
        if (now === 1) { triggerRise.set(sensor.componentId, cpu.cycles); continue }
        const risenAt = triggerRise.get(sensor.componentId)
        triggerRise.delete(sensor.componentId)
        if (risenAt === undefined) continue
        const highUs = ((cpu.cycles - risenAt) / CPU_FREQUENCY_HZ) * 1_000_000
        const pulseUs = echoPulseMicroseconds(sensor.distanceCm)
        if (highUs < HC_SR04_MIN_TRIGGER_US || pulseUs === null) continue
        const echoPort = ports[echo.port]
        cpu.addClockEvent(() => {
          echoPort.setPin(echo.bit, true)
          cpu.addClockEvent(() => echoPort.setPin(echo.bit, false), Math.round((pulseUs / 1_000_000) * CPU_FREQUENCY_HZ))
        }, Math.round((HC_SR04_RESPONSE_DELAY_US / 1_000_000) * CPU_FREQUENCY_HZ))
      }
    }
    portB.addListener(watchTrigger("B"))
    portC.addListener(watchTrigger("C"))
    portD.addListener(watchTrigger("D"))

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
        publish()
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

  return { pins, pwm }
}
