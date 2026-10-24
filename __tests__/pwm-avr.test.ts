import { describe, expect, it } from "vitest"
import { CPU, avrInstruction, AVRIOPort, AVRTimer, portDConfig, timer0Config } from "avr8js"
import { PwmTracker } from "@/lib/simulator/avr/pwm-tracker"

// Hand-assembled: Timer0 fast PWM on OC0A (D6), prescaler 64, OCR0A = 64, then spin.
const PROGRAM = [0xe803, 0xbd04, 0xe003, 0xbd05, 0xe400, 0xbd07, 0x9a56, 0xcfff]

describe("PWM measured from emulated Timer0", () => {
  it("reports ~25% duty at ~977 Hz on D6", () => {
    const flash = new Uint16Array(0x8000)
    PROGRAM.forEach((w, i) => (flash[i] = w))
    const cpu = new CPU(flash)
    const portD = new AVRIOPort(cpu, portDConfig)
    new AVRTimer(cpu, timer0Config)
    const tracker = new PwmTracker(16_000_000)
    portD.addListener((value, old) => {
      if (((value ^ old) >> 6) & 1) tracker.record(cpu.cycles, ((value >> 6) & 1) === 1)
    })
    while (cpu.cycles < 3_200_000) {
      avrInstruction(cpu)
      cpu.tick()
    }
    const reading = tracker.sample(cpu.cycles)
    expect(reading).not.toBeNull()
    expect(reading!.duty).toBeGreaterThan(0.23)
    expect(reading!.duty).toBeLessThan(0.28)
    expect(reading!.frequencyHz).toBeGreaterThan(950)
    expect(reading!.frequencyHz).toBeLessThan(1000)
  })
})
