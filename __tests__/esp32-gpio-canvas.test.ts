import { describe, expect, it } from "vitest"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { runSimulationTick } from "@/lib/simulator/engine/simulation-engine"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import { createEsp32GpioRuntimeAdapter } from "@/lib/simulator/esp32/gpio-runtime-adapter"
import type { ComponentPin, PlacedComponent, Wire } from "@/types/simulator"

const gpioMessage = (pin: number, level: 0 | 1) => ({
  channel: "solderhub:esp32-bridge",
  version: 1,
  type: "gpio",
  pin,
  level,
})

function place(id: string, type: string, metadata: Record<string, unknown> = {}): PlacedComponent {
  const def = getComponentDefinition(type)!
  return { id, type, name: def.name, x: 0, y: 0, rotation: 0, metadata: { ...def.defaultMetadata, ...metadata } }
}

function simulate(components: PlacedComponent[], wires: Wire[]) {
  const getPins = (c: PlacedComponent): ComponentPin[] => instantiatePins(c.id, getComponentDefinition(c.type)!.pinTemplates)
  return runSimulationTick(components, wires, getComponentDefinition, getPins, true)
}

const wire = (id: string, a: string, aPin: string, b: string, bPin: string): Wire => ({
  id,
  fromComponentId: a,
  fromPinId: `${a}_${aPin}`,
  toComponentId: b,
  toPinId: `${b}_${bPin}`,
})

/** LED anode wired straight to a GPIO header pin, cathode to a board GND pin. */
function ledCircuit(boardType: "esp32-devkit" | "esp32-c3", ioPin: string, gndPin: string, boardMetadata: Record<string, unknown>) {
  const board = place("board", boardType, boardMetadata)
  const led = place("led", "led")
  const wires = [wire("w1", "board", ioPin, "led", "anode"), wire("w2", "board", gndPin, "led", "cathode")]
  return { components: [board, led], wires }
}

describe("ESP32 firmware GPIO drives the circuit", () => {
  it("lights an LED on a non-default pin only when the pin is an OUTPUT driven HIGH", () => {
    const high = ledCircuit("esp32-devkit", "IO4", "GND1", { pinModes: { IO4: "OUTPUT" }, pinValues: { IO4: 1 } })
    expect(simulate(high.components, high.wires).led.flags.isOn).toBe(true)

    const low = ledCircuit("esp32-devkit", "IO4", "GND1", { pinModes: { IO4: "OUTPUT" }, pinValues: { IO4: 0 } })
    expect(simulate(low.components, low.wires).led.flags.isOn).toBe(false)

    // pinValues alone (mode never set) must not drive the net.
    const noMode = ledCircuit("esp32-devkit", "IO4", "GND1", { pinModes: {}, pinValues: { IO4: 1 } })
    expect(simulate(noMode.components, noMode.wires).led.flags.isOn).toBe(false)
  })

  it("drives ESP32-C3 header pins too, including suffixed ground pins", () => {
    const c = ledCircuit("esp32-c3", "GPIO3", "GND_2", { pinModes: { GPIO3: "OUTPUT" }, pinValues: { GPIO3: 1 } })
    expect(simulate(c.components, c.wires).led.flags.isOn).toBe(true)
  })

  it("end to end: GPIO bridge messages blink the canvas LED via the adapter state", () => {
    let metadata: Record<string, unknown> = { ...getComponentDefinition("esp32-devkit")!.defaultMetadata, boardFamily: "keep-me" }
    const adapter = createEsp32GpioRuntimeAdapter({
      boardType: "esp32-devkit",
      onPinValues: () => {},
      onPinState: (state) => { metadata = { ...metadata, ...state } },
    })
    adapter.reset()

    const observe = () => {
      const { components, wires } = ledCircuit("esp32-devkit", "IO4", "GND1", metadata)
      return simulate(components, wires).led.flags.isOn
    }

    expect(observe()).toBe(false)
    adapter.consume(gpioMessage(4, 1))
    expect(observe()).toBe(true)
    adapter.consume(gpioMessage(4, 0))
    expect(observe()).toBe(false)
    adapter.consume(gpioMessage(4, 1))
    expect(observe()).toBe(true)

    // Unrelated metadata survives the pin-state updates.
    expect(metadata.boardFamily).toBe("keep-me")
  })
})

describe("ESP32 GPIO runtime adapter pin modes", () => {
  it("marks driven pins OUTPUT and reports one combined state per change", () => {
    const states: unknown[] = []
    const adapter = createEsp32GpioRuntimeAdapter({
      boardType: "esp32-devkit",
      initialPinModes: { IO5: "OUTPUT" },
      initialPinValues: { IO5: 1 },
      onPinValues: () => {},
      onPinState: (s) => states.push(s),
    })

    adapter.consume(gpioMessage(2, 1))
    adapter.consume(gpioMessage(2, 1)) // duplicate: no new state
    adapter.consume(gpioMessage(2, 0))

    expect(states).toEqual([
      { pinModes: { IO5: "OUTPUT", IO2: "OUTPUT" }, pinValues: { IO5: 1, IO2: 1 } },
      { pinModes: { IO5: "OUTPUT", IO2: "OUTPUT" }, pinValues: { IO5: 1, IO2: 0 } },
    ])
  })

  it("reset clears modes and values", () => {
    const states: unknown[] = []
    const adapter = createEsp32GpioRuntimeAdapter({
      boardType: "esp32-c3",
      onPinValues: () => {},
      onPinState: (s) => states.push(s),
    })
    adapter.consume(gpioMessage(3, 1))
    adapter.reset()
    expect(adapter.getPinState()).toEqual({ pinModes: {}, pinValues: {} })
    expect(states.at(-1)).toEqual({ pinModes: {}, pinValues: {} })
  })

  it("ignores GPIOs the selected board does not expose", () => {
    const states: unknown[] = []
    const adapter = createEsp32GpioRuntimeAdapter({
      boardType: "esp32-devkit",
      onPinValues: () => {},
      onPinState: (s) => states.push(s),
    })
    expect(adapter.consume(gpioMessage(40, 1))).toBe(false)
    expect(states).toEqual([])
  })
})
