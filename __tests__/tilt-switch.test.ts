import { describe, expect, it } from "vitest"
import { tiltSwitchDefinition } from "@/lib/simulator/components/tilt-switch/definition"
import { arduinoUnoDefinition } from "@/lib/simulator/components/arduino-uno/definition"
import { runSimulationTick } from "@/lib/simulator/engine/simulation-engine"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import type { ComponentPin, PlacedComponent, Wire } from "@/types/simulator"

function component(tilted: boolean): PlacedComponent {
  return {
    id: "tilt",
    type: tiltSwitchDefinition.type,
    name: tiltSwitchDefinition.name,
    x: 0,
    y: 0,
    rotation: 0,
    metadata: { tilted },
  }
}

describe("tilt switch", () => {
  const pins = instantiatePins("tilt", tiltSwitchDefinition.pinTemplates)

  it("leaves its contacts open in the default orientation", () => {
    expect(tiltSwitchDefinition.getInternalConnections(component(false), pins)).toEqual([])
  })

  it("closes its contacts when tilted", () => {
    expect(tiltSwitchDefinition.getInternalConnections(component(true), pins)).toEqual([
      ["tilt_pin1", "tilt_pin2"],
    ])
  })

  it("reports the same state to the renderer and properties panel", () => {
    const result = tiltSwitchDefinition.simulate(component(true), pins, {
      tilt_pin1: 5,
      tilt_pin2: 5,
    })

    expect(result.flags).toEqual({ tilted: true, closed: true })
    expect(result.pinStates.tilt_pin1.state).toBe("HIGH")
    expect(result.pinStates.tilt_pin2.state).toBe("HIGH")
  })

  it("propagates a digital signal only while the contacts are closed", () => {
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
    const switchComponent = component(true)
    const pinCache = new Map<string, ComponentPin[]>([
      [arduino.id, instantiatePins(arduino.id, arduinoUnoDefinition.pinTemplates)],
      [switchComponent.id, pins],
    ])
    const findPin = (owner: PlacedComponent, name: string) =>
      pinCache.get(owner.id)!.find((pin) => pin.name === name)!.id
    const wires: Wire[] = [
      {
        id: "in",
        fromComponentId: arduino.id,
        fromPinId: findPin(arduino, "D10"),
        toComponentId: switchComponent.id,
        toPinId: findPin(switchComponent, "pin1"),
      },
      {
        id: "out",
        fromComponentId: switchComponent.id,
        fromPinId: findPin(switchComponent, "pin2"),
        toComponentId: arduino.id,
        toPinId: findPin(arduino, "D9"),
      },
    ]

    const closed = runSimulationTick(
      [arduino, switchComponent],
      wires,
      getComponentDefinition,
      (owner) => pinCache.get(owner.id)!,
      true
    )
    switchComponent.metadata.tilted = false
    const open = runSimulationTick(
      [arduino, switchComponent],
      wires,
      getComponentDefinition,
      (owner) => pinCache.get(owner.id)!,
      true
    )

    expect(closed[arduino.id].pinStates[findPin(arduino, "D9")].state).toBe("HIGH")
    expect(open[arduino.id].pinStates[findPin(arduino, "D9")].state).toBe("FLOATING")
  })
})
