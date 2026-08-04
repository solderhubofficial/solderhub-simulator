import { describe, expect, it } from "vitest"
import { hcSr04Definition } from "@/lib/simulator/components/hc-sr04/definition"
import { arduinoUnoDefinition } from "@/lib/simulator/components/arduino-uno/definition"
import { simulateHcSr04 } from "@/lib/simulator/engine/component-simulation"
import { runSimulationTick } from "@/lib/simulator/engine/simulation-engine"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import type { ComponentPin, PlacedComponent, Wire } from "@/types/simulator"

function component(distanceCm: number): PlacedComponent {
  return {
    id: "sensor",
    type: hcSr04Definition.type,
    name: hcSr04Definition.name,
    x: 0,
    y: 0,
    rotation: 0,
    metadata: { distanceCm },
  }
}

describe("HC-SR04 simulation", () => {
  const pins = instantiatePins("sensor", hcSr04Definition.pinTemplates)
  const pinId = (name: string) => pins.find((pin) => pin.name === name)!.id

  it("drives echo HIGH and reports a distance-proportional pulse", () => {
    const result = simulateHcSr04(component(25), pins, {
      [pinId("vcc")]: 5,
      [pinId("gnd")]: 0,
      [pinId("trig")]: 5,
      [pinId("echo")]: null,
    })

    expect(result.pinStates[pinId("echo")]).toMatchObject({ voltage: 5, state: "HIGH" })
    expect(result.flags).toMatchObject({
      powered: true,
      triggered: true,
      distanceCm: 25,
      echoPulseUs: 1450,
    })
  })

  it("keeps echo LOW when unpowered or not triggered", () => {
    const result = simulateHcSr04(component(100), pins, {
      [pinId("vcc")]: 5,
      [pinId("gnd")]: 0,
      [pinId("trig")]: 0,
      [pinId("echo")]: null,
    })

    expect(result.pinStates[pinId("echo")]).toMatchObject({ voltage: 0, state: "LOW" })
    expect(result.flags.triggered).toBe(false)
  })

  it("clamps the simulated distance to the HC-SR04 operating range", () => {
    const result = simulateHcSr04(component(900), pins, {
      [pinId("vcc")]: 5,
      [pinId("gnd")]: 0,
      [pinId("trig")]: 5,
      [pinId("echo")]: null,
    })

    expect(result.flags.distanceCm).toBe(400)
    expect(result.flags.echoPulseUs).toBe(23200)
  })

  it("drives a connected Arduino input through the electrical net", () => {
    const arduino: PlacedComponent = {
      id: "arduino",
      type: arduinoUnoDefinition.type,
      name: arduinoUnoDefinition.name,
      x: 0,
      y: 0,
      rotation: 0,
      metadata: {
        pinModes: { D10: "OUTPUT", D9: "INPUT" },
        pinValues: { D10: 1 },
      },
    }
    const sensor = component(30)
    const pinCache = new Map<string, ComponentPin[]>([
      [arduino.id, instantiatePins(arduino.id, arduinoUnoDefinition.pinTemplates)],
      [sensor.id, pins],
    ])
    const findPin = (owner: PlacedComponent, name: string) =>
      pinCache.get(owner.id)!.find((pin) => pin.name === name)!.id
    const connect = (id: string, fromName: string, toName: string): Wire => ({
      id,
      fromComponentId: arduino.id,
      fromPinId: findPin(arduino, fromName),
      toComponentId: sensor.id,
      toPinId: findPin(sensor, toName),
    })
    const wires = [
      connect("vcc", "5V", "vcc"),
      connect("gnd", "GND1", "gnd"),
      connect("trig", "D10", "trig"),
      connect("echo", "D9", "echo"),
    ]

    const results = runSimulationTick(
      [arduino, sensor],
      wires,
      getComponentDefinition,
      (owner) => pinCache.get(owner.id)!,
      true
    )

    expect(results[sensor.id].pinStates[findPin(sensor, "echo")].state).toBe("HIGH")
    expect(results[arduino.id].pinStates[findPin(arduino, "D9")].state).toBe("HIGH")
  })
})
