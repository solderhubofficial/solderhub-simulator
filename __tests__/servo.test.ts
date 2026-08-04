import { describe, expect, it } from "vitest"
import { servoDefinition } from "@/lib/simulator/components/servo/definition"
import { arduinoUnoDefinition } from "@/lib/simulator/components/arduino-uno/definition"
import { simulateServo } from "@/lib/simulator/engine/component-simulation"
import { runSimulationTick } from "@/lib/simulator/engine/simulation-engine"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import type { ComponentPin, PlacedComponent, Wire } from "@/types/simulator"

const component: PlacedComponent = {
  id: "servo",
  type: servoDefinition.type,
  name: servoDefinition.name,
  x: 0,
  y: 0,
  rotation: 0,
  metadata: {},
}

describe("SG90 servo approximation", () => {
  const pins = instantiatePins(component.id, servoDefinition.pinTemplates)
  const pinId = (name: string) => pins.find((pin) => pin.name === name)!.id
  const run = (vcc: number | null, signal: number | null, gnd: number | null = 0) =>
    simulateServo(component, pins, {
      [pinId("vcc")]: vcc,
      [pinId("gnd")]: gnd,
      [pinId("signal")]: signal,
    })

  it("maps LOW and HIGH to the two mechanical end stops", () => {
    expect(run(5, 0).flags).toEqual({ powered: true, angle: 0 })
    expect(run(5, 5).flags).toEqual({ powered: true, angle: 180 })
  })

  it("maps a duty-cycle-equivalent intermediate voltage to an intermediate angle", () => {
    expect(run(5, 2.5).flags).toEqual({ powered: true, angle: 90 })
  })

  it("clamps out-of-range signals to the servo travel", () => {
    expect(run(5, -2).flags.angle).toBe(0)
    expect(run(5, 8).flags.angle).toBe(180)
  })

  it("does not move when the supply is missing", () => {
    expect(run(null, 5).flags).toEqual({ powered: false, angle: 0 })
  })

  it("responds to a connected Arduino output in a complete circuit", () => {
    const arduino: PlacedComponent = {
      id: "arduino",
      type: arduinoUnoDefinition.type,
      name: arduinoUnoDefinition.name,
      x: 0,
      y: 0,
      rotation: 0,
      metadata: {
        pinModes: { D10: "OUTPUT" },
        pinValues: { D10: 1 },
      },
    }
    const pinCache = new Map<string, ComponentPin[]>([
      [arduino.id, instantiatePins(arduino.id, arduinoUnoDefinition.pinTemplates)],
      [component.id, pins],
    ])
    const findPin = (owner: PlacedComponent, name: string) =>
      pinCache.get(owner.id)!.find((pin) => pin.name === name)!.id
    const wire = (id: string, arduinoPin: string, servoPin: string): Wire => ({
      id,
      fromComponentId: arduino.id,
      fromPinId: findPin(arduino, arduinoPin),
      toComponentId: component.id,
      toPinId: findPin(component, servoPin),
    })

    const results = runSimulationTick(
      [arduino, component],
      [wire("vcc", "5V", "vcc"), wire("gnd", "GND1", "gnd"), wire("signal", "D10", "signal")],
      getComponentDefinition,
      (owner) => pinCache.get(owner.id)!,
      true
    )

    expect(results[component.id].flags).toEqual({ powered: true, angle: 180 })
  })
})
