import { describe, expect, it } from "vitest"
import { rgbLedDefinition } from "@/lib/simulator/components/rgb-led/definition"
import { simulateRgbLed } from "@/lib/simulator/engine/component-simulation"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import type { PlacedComponent } from "@/types/simulator"

const component: PlacedComponent = {
  id: "rgb",
  type: rgbLedDefinition.type,
  name: rgbLedDefinition.name,
  x: 0,
  y: 0,
  rotation: 0,
  metadata: {},
}

describe("common-cathode RGB LED simulation", () => {
  const pins = instantiatePins(component.id, rgbLedDefinition.pinTemplates)
  const pinId = (name: string) => pins.find((pin) => pin.name === name)!.id

  it("tracks each color channel independently", () => {
    const result = simulateRgbLed(component, pins, {
      [pinId("red")]: 5,
      [pinId("green")]: 0,
      [pinId("blue")]: 5,
      [pinId("cathode")]: 0,
    })

    expect(result.flags).toEqual({
      redOn: true,
      greenOn: false,
      blueOn: true,
      isOn: true,
    })
  })

  it("stays off when its common cathode is floating", () => {
    const result = simulateRgbLed(component, pins, {
      [pinId("red")]: 5,
      [pinId("green")]: 5,
      [pinId("blue")]: 5,
      [pinId("cathode")]: null,
    })

    expect(result.flags).toEqual({
      redOn: false,
      greenOn: false,
      blueOn: false,
      isOn: false,
    })
  })

  it("requires the channel voltage to exceed the cathode by the LED forward voltage", () => {
    const result = simulateRgbLed(component, pins, {
      [pinId("red")]: 2.9,
      [pinId("green")]: 3,
      [pinId("blue")]: 5,
      [pinId("cathode")]: 1,
    })

    expect(result.flags).toMatchObject({ redOn: false, greenOn: true, blueOn: true })
  })
})
