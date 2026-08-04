import { describe, expect, it } from "vitest"
import { arduinoUnoDefinition } from "@/lib/simulator/components/arduino-uno/definition"
import { irReceiverDefinition } from "@/lib/simulator/components/ir-receiver/definition"
import { simulateIrReceiver } from "@/lib/simulator/engine/component-simulation"
import { runSimulationTick } from "@/lib/simulator/engine/simulation-engine"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import type { ComponentPin, PlacedComponent, Wire } from "@/types/simulator"

function receiver(pulseActive: boolean): PlacedComponent {
  return {
    id: "ir",
    type: irReceiverDefinition.type,
    name: irReceiverDefinition.name,
    x: 0,
    y: 0,
    rotation: 0,
    metadata: { pulseActive },
  }
}

describe("VS1838B IR receiver", () => {
  const pins = instantiatePins("ir", irReceiverDefinition.pinTemplates)
  const pinId = (name: string) => pins.find((pin) => pin.name === name)!.id
  const run = (pulseActive: boolean, vcc: number | null = 5) =>
    simulateIrReceiver(receiver(pulseActive), pins, {
      [pinId("vcc")]: vcc,
      [pinId("gnd")]: 0,
      [pinId("out")]: null,
    })

  it("idles HIGH while powered", () => {
    const result = run(false)
    expect(result.pinStates[pinId("out")]).toMatchObject({ voltage: 5, state: "HIGH" })
    expect(result.flags).toEqual({ powered: true, pulseActive: false, pulseMs: 120 })
  })

  it("pulses LOW for a simulated remote command", () => {
    const result = run(true)
    expect(result.pinStates[pinId("out")]).toMatchObject({ voltage: 0, state: "LOW" })
    expect(result.flags.pulseActive).toBe(true)
  })

  it("leaves OUT floating without power", () => {
    const result = run(true, null)
    expect(result.pinStates[pinId("out")]).toMatchObject({ voltage: null, state: "FLOATING" })
    expect(result.flags).toMatchObject({ powered: false, pulseActive: false })
  })

  it("drives a connected Arduino input active-low", () => {
    const arduino: PlacedComponent = {
      id: "arduino",
      type: arduinoUnoDefinition.type,
      name: arduinoUnoDefinition.name,
      x: 0,
      y: 0,
      rotation: 0,
      metadata: { pinModes: { D9: "INPUT" }, pinValues: {} },
    }
    const sensor = receiver(true)
    const pinCache = new Map<string, ComponentPin[]>([
      [arduino.id, instantiatePins(arduino.id, arduinoUnoDefinition.pinTemplates)],
      [sensor.id, pins],
    ])
    const findPin = (owner: PlacedComponent, name: string) =>
      pinCache.get(owner.id)!.find((pin) => pin.name === name)!.id
    const wire = (id: string, arduinoPin: string, receiverPin: string): Wire => ({
      id,
      fromComponentId: arduino.id,
      fromPinId: findPin(arduino, arduinoPin),
      toComponentId: sensor.id,
      toPinId: findPin(sensor, receiverPin),
    })
    const wires = [
      wire("vcc", "5V", "vcc"),
      wire("gnd", "GND1", "gnd"),
      wire("out", "D9", "out"),
    ]

    const results = runSimulationTick(
      [arduino, sensor],
      wires,
      getComponentDefinition,
      (owner) => pinCache.get(owner.id)!,
      true
    )

    expect(results[sensor.id].pinStates[findPin(sensor, "out")].state).toBe("LOW")
    expect(results[arduino.id].pinStates[findPin(arduino, "D9")].state).toBe("LOW")

    sensor.metadata.pulseActive = false
    const idleResults = runSimulationTick(
      [arduino, sensor],
      wires,
      getComponentDefinition,
      (owner) => pinCache.get(owner.id)!,
      true
    )
    expect(idleResults[sensor.id].pinStates[findPin(sensor, "out")].state).toBe("HIGH")
    expect(idleResults[arduino.id].pinStates[findPin(arduino, "D9")].state).toBe("HIGH")
  })
})
