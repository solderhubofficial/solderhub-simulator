"use client"

import { useEffect, useRef, useState } from "react"
import { CPU, avrInstruction, AVRIOPort, AVRTimer, AVRADC, AVRUSART, AVRTWI, adcConfig, usart0Config, portBConfig, portCConfig, portDConfig, timer0Config, timer1Config, timer2Config, twiConfig } from "avr8js"
import { loadIntelHex } from "@/lib/simulator/firmware/hex-loader"
import { PwmTracker } from "@/lib/simulator/avr/pwm-tracker"

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
export interface ServoPwmReading { angle: number; pulseWidthUs: number; frequencyHz: number }

export function useAvrRunner(hex: string | null, running: boolean, uploadId = 0, analogInputs: Partial<Record<"A0" | "A1" | "A2" | "A3" | "A4" | "A5", number>> = {}) {
  const [pins, setPins] = useState<Record<string, boolean>>({})
  const [pwm, setPwm] = useState<Record<string, ServoPwmReading>>({})
  const pwmSnapshotRef = useRef("")
  const analogInputsRef = useRef(analogInputs)
  analogInputsRef.current = analogInputs
  const runningRef = useRef(running)
  runningRef.current = running

  useEffect(() => {
    if (!hex) return
    setPins({})
    setPwm({})
    pwmSnapshotRef.current = ""

    const progMem = new Uint16Array(FLASH_WORDS)
    const progBytes = new Uint8Array(progMem.buffer)
    loadIntelHex(hex, progBytes)

    const cpu = new CPU(progMem)
    // Timer peripherals are required by Servo.h (Timer1 compare interrupts) and
    // Arduino timing APIs. Without them the sketch compiles but servo pulses never occur.
    new AVRTimer(cpu, timer0Config)
    new AVRTimer(cpu, timer1Config)
    new AVRTimer(cpu, timer2Config)
    const adc = new AVRADC(cpu, adcConfig)
    const portB = new AVRIOPort(cpu, portBConfig)
    const portC = new AVRIOPort(cpu, portCConfig)
    const portD = new AVRIOPort(cpu, portDConfig)
    const usart = new AVRUSART(cpu, usart0Config, CPU_FREQUENCY_HZ)
    // I2C slave bus for PCF8574 LCD backpacks and SSD1306 OLEDs.
    const twi = new AVRTWI(cpu, twiConfig, CPU_FREQUENCY_HZ)
    let activeI2cAddress = 0
    let activeI2cWrite = true
    twi.eventHandler = {
      start: () => { window.dispatchEvent(new CustomEvent("simulator:i2c-start")); twi.completeStart() },
      stop: () => {
        window.dispatchEvent(new CustomEvent("simulator:i2c-stop", { detail: { address: activeI2cAddress, write: activeI2cWrite } }))
        twi.completeStop()
      },
      connectToSlave: (address, write) => {
        activeI2cAddress = address
        activeI2cWrite = write
        window.dispatchEvent(new CustomEvent("simulator:i2c-connect", { detail: { address, write } }))
        twi.completeConnect(true)
      },
      writeByte: (value) => {
        window.dispatchEvent(new CustomEvent("simulator:i2c-byte", { detail: { address: activeI2cAddress, write: activeI2cWrite, value } }))
        twi.completeWrite(true)
      },
      readByte: () => twi.completeRead(0xff),
    }
    const serialInputQueue: number[] = []
    const allPins = [...PORTB_PINS, ...PORTC_PINS, ...PORTD_PINS]
    const pwmTrackers = new Map(allPins.map((name) => [name, new PwmTracker(CPU_FREQUENCY_HZ, 0.1, 3)]))

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

    const applyPortChange = (names: string[]) => {
      let previousValue: number | null = null
      return (value: number) => {
        // Record every electrical edge at CPU-cycle resolution. React state alone
        // is frame-batched and loses the short 1–2 ms pulses used by Servo.h.
        names.forEach((name, bit) => {
          const high = ((value >> bit) & 1) === 1
          const previousHigh = previousValue === null ? !high : ((previousValue >> bit) & 1) === 1
          if (previousValue === null || high !== previousHigh) {
            pwmTrackers.get(name)?.record(cpu.cycles, high)
          }
        })
        previousValue = value
        setPins((prev) => ({ ...prev, ...portValueToPins(value, names) }))
      }
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
        // Keep the ATmega328P ADC inputs in sync with the circuit potentiometers.
        for (let channel = 0; channel < 6; channel++) {
          const pinName = `A${channel}` as keyof typeof analogInputsRef.current
          const voltage = analogInputsRef.current[pinName]
          adc.channelValues[channel] = typeof voltage === "number" ? Math.min(5, Math.max(0, voltage)) : 0
        }
        const targetCycles = cpu.cycles + dt * CPU_FREQUENCY_HZ
        while (cpu.cycles < targetCycles) {
          avrInstruction(cpu)
          cpu.tick()
        }

        const nextPwm: Record<string, ServoPwmReading> = {}
        for (const [pinName, tracker] of pwmTrackers) {
          const reading = tracker.sample(cpu.cycles)
          if (!reading || reading.frequencyHz < 40 || reading.frequencyHz > 70) continue
          const pulseWidthUs = (reading.duty / reading.frequencyHz) * 1_000_000
          // Servo.h's default attach range is 544–2400 us. Reject unrelated
          // PWM outputs so analogWrite() does not masquerade as a servo command.
          if (pulseWidthUs < 500 || pulseWidthUs > 2500) continue
          const angle = Math.round(Math.min(180, Math.max(0, (pulseWidthUs - 544) * 180 / (2400 - 544))))
          nextPwm[pinName] = { angle, pulseWidthUs: Math.round(pulseWidthUs), frequencyHz: Math.round(reading.frequencyHz) }
        }
        const serialized = JSON.stringify(nextPwm)
        if (serialized !== pwmSnapshotRef.current) {
          pwmSnapshotRef.current = serialized
          setPwm(nextPwm)
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

  return { pins, pwm }
}
