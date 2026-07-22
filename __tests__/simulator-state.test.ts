import { describe, expect, it } from "vitest"
import { initialCanvasState, simulatorReducer } from "@/lib/simulator/reducer"
import type { PlacedComponent, Wire } from "@/types/simulator"

describe("simulator reducer", () => {
  it("rewires a wire endpoint to a different pin", () => {
    const source: PlacedComponent = {
      id: "comp_a",
      type: "led",
      name: "LED",
      x: 0,
      y: 0,
      rotation: 0,
      metadata: {},
    }

    const target: PlacedComponent = {
      id: "comp_b",
      type: "resistor",
      name: "Resistor",
      x: 80,
      y: 0,
      rotation: 0,
      metadata: {},
    }

    const wire: Wire = {
      id: "wire_1",
      fromComponentId: source.id,
      fromPinId: "comp_a_anode",
      toComponentId: target.id,
      toPinId: "comp_b_1",
    }

    const state = simulatorReducer(
      {
        ...initialCanvasState,
        components: [source, target],
        wires: [wire],
      },
      {
        type: "REWIRE_WIRE",
        wireId: wire.id,
        endpoint: "to",
        componentId: target.id,
        pinId: "comp_b_2",
      }
    )

    expect(state.wires[0]).toMatchObject({
      id: wire.id,
      fromComponentId: source.id,
      fromPinId: "comp_a_anode",
      toComponentId: target.id,
      toPinId: "comp_b_2",
    })
  })
})
