import { describe, expect, it } from "vitest"
import { a3144Definition } from "@/lib/simulator/components/a3144/definition"
import { simulateA3144 } from "@/lib/simulator/engine/component-simulation"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import type { PlacedComponent } from "@/types/simulator"

const pins = instantiatePins("hall", a3144Definition.pinTemplates)
const pinId = (name: string) => pins.find((pin) => pin.name === name)!.id

function sensor(magnetDetected: boolean): PlacedComponent {
  return {
    id: "hall",
    type: a3144Definition.type,
    name: a3144Definition.name,
    x: 0,
    y: 0,
    rotation: 0,
    metadata: { magnetDetected },
  }
}

describe("A3144 Hall-effect switch", () => {
  it("registers as an input component with VCC, GND and OUT pins", () => {
    expect(a3144Definition.category).toBe("input")
    expect(a3144Definition.pinTemplates.map((pin) => pin.name)).toEqual(["vcc", "gnd", "out"])
  })

  it("sinks OUT LOW when a magnet is detected and the sensor is powered", () => {
    const result = simulateA3144(sensor(true), pins, {
      [pinId("vcc")]: 5,
      [pinId("gnd")]: 0,
      [pinId("out")]: 3.3,
    })
    expect(result.pinStates[pinId("out")]).toMatchObject({ voltage: 0, state: "LOW" })
    expect(result.flags).toMatchObject({ powered: true, magnetDetected: true, outputLow: true })
  })

  it("releases OUT when the magnet is absent (external pull-up determines the voltage)", () => {
    const result = simulateA3144(sensor(false), pins, {
      [pinId("vcc")]: 5,
      [pinId("gnd")]: 0,
      [pinId("out")]: 3.3,
    })
    expect(result.pinStates[pinId("out")]).toMatchObject({ voltage: 3.3, state: "HIGH" })
    expect(result.flags).toMatchObject({ powered: true, magnetDetected: false, outputLow: false })
  })

  it("does not assert detection below the minimum supply voltage", () => {
    const result = simulateA3144(sensor(true), pins, {
      [pinId("vcc")]: 3.3,
      [pinId("gnd")]: 0,
      [pinId("out")]: null,
    })
    expect(result.flags).toMatchObject({ powered: false, magnetDetected: false })
    expect(result.pinStates[pinId("out")]).toMatchObject({ voltage: null, state: "FLOATING" })
  })
})
