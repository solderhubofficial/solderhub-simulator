import { describe, expect, it } from "vitest"
import { attachPwm, carryPwm, pwmOnPin, servoAngleFromPulse, servoPulseMicroseconds } from "@/lib/simulator/engine/pwm"
import { simulateLed, simulateServo } from "@/lib/simulator/engine/component-simulation"
import type { ComponentPin, PlacedComponent } from "@/types/simulator"

const pin = (id: string, name: string) => ({ id, name }) as unknown as ComponentPin
const comp = (id: string) => ({ id, metadata: {} }) as unknown as PlacedComponent

describe("pwm helpers", () => {
  it("maps servo pulse widths to angles", () => {
    expect(servoAngleFromPulse(544)).toBe(0)
    expect(servoAngleFromPulse(1472)).toBe(90)
    expect(servoAngleFromPulse(2400)).toBe(180)
    expect(servoPulseMicroseconds({ duty: 0.075, frequencyHz: 50 })).toBeCloseTo(1500, 0)
    expect(servoPulseMicroseconds({ duty: 0.5, frequencyHz: 490 })).toBeNull()
  })
  it("carries pwm to per-part voltage maps", () => {
    const a = { x: 5 }
    attachPwm(a, { x: { duty: 0.3, frequencyHz: 490 } })
    const b = { x: 5 }
    carryPwm(a, b)
    expect(pwmOnPin(b, "x")?.duty).toBe(0.3)
    expect(pwmOnPin(b, "y")).toBeNull()
  })
  it("dims an LED by duty and sets servo angle", () => {
    const led = [pin("l_a", "anode"), pin("l_c", "cathode")]
    const v = { l_a: 5, l_c: 0 }
    attachPwm(v, { l_a: { duty: 0.25, frequencyHz: 490 } })
    expect(simulateLed(comp("l"), led, v).flags.brightness).toBe(0.25)
    const plain = { l_a: 5, l_c: 0 }
    expect(simulateLed(comp("l"), led, plain).flags.brightness).toBe(1)

    const servo = [pin("s_v", "vcc"), pin("s_g", "gnd"), pin("s_s", "signal")]
    const sv = { s_v: 5, s_g: 0, s_s: 5 }
    attachPwm(sv, { s_s: { duty: 0.075, frequencyHz: 50 } })
    expect(simulateServo(comp("s"), servo, sv).flags.angle).toBe(93)
  })
})
