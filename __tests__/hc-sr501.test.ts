import { describe, expect, it } from "vitest"
import { hcSr501Definition } from "@/lib/simulator/components/hc-sr501/definition"
import { simulateHcSr501 } from "@/lib/simulator/engine/component-simulation"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import type { PlacedComponent } from "@/types/simulator"

const pins = instantiatePins("pir", hcSr501Definition.pinTemplates)
const pinId = (name: string) => pins.find((pin) => pin.name === name)!.id
const sensor = (motionDetected: boolean): PlacedComponent => ({
  id: "pir", type: hcSr501Definition.type, name: hcSr501Definition.name,
  x: 0, y: 0, rotation: 0, metadata: { motionDetected },
})

describe("HC-SR501 PIR motion sensor", () => {
  it("exposes VCC, OUT and GND pins", () => {
    expect(hcSr501Definition.pinTemplates.map((pin) => pin.name)).toEqual(["vcc", "out", "gnd"])
  })
  it("drives OUT HIGH when powered and motion is simulated", () => {
    const result = simulateHcSr501(sensor(true), pins, {
      [pinId("vcc")]: 5, [pinId("gnd")]: 0, [pinId("out")]: 0,
    })
    expect(result.pinStates[pinId("out")]).toMatchObject({ voltage: 3.3, state: "HIGH" })
    expect(result.flags).toMatchObject({ powered: true, motionDetected: true })
  })
  it("holds OUT LOW when no motion is simulated", () => {
    const result = simulateHcSr501(sensor(false), pins, {
      [pinId("vcc")]: 5, [pinId("gnd")]: 0, [pinId("out")]: 0,
    })
    expect(result.pinStates[pinId("out")]).toMatchObject({ voltage: 0, state: "LOW" })
    expect(result.flags).toMatchObject({ powered: true, motionDetected: false })
  })
  it("does not assert motion when unpowered", () => {
    const result = simulateHcSr501(sensor(true), pins, {
      [pinId("vcc")]: 0, [pinId("gnd")]: 0, [pinId("out")]: null,
    })
    expect(result.flags).toMatchObject({ powered: false, motionDetected: false })
  })
})
