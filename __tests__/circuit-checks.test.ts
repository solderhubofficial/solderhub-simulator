import { describe, expect, it } from "vitest"
import { inspectCircuit } from "@/lib/simulator/circuit-checks"
import type { ComponentDefinition, PlacedComponent, Wire } from "@/types/simulator"

const boardDefinition = { type: "arduino-uno", name: "Arduino Uno", category: "board" } as ComponentDefinition
const ledDefinition = { type: "led", name: "LED", category: "output" } as ComponentDefinition

const board: PlacedComponent = {
  id: "board-1", type: "arduino-uno", name: "Arduino Uno", x: 0, y: 0, rotation: 0, metadata: {},
}
const led: PlacedComponent = {
  id: "led-1", type: "led", name: "LED", x: 120, y: 0, rotation: 0, metadata: {},
}
const getDefinition = (type: string) => ({
  "arduino-uno": boardDefinition,
  led: ledDefinition,
}[type])
const getPins = (component: PlacedComponent) => component.type === "led"
  ? [{ id: "led-1_anode", name: "anode" }, { id: "led-1_cathode", name: "cathode" }]
  : [{ id: "board-1_D13", name: "D13" }]

describe("Circuit Coach wiring checks", () => {
  it("suggests a starting point for an empty canvas", () => {
    const checks = inspectCircuit([], [], getDefinition, getPins)
    expect(checks).toHaveLength(1)
    expect(checks[0].id).toBe("empty-canvas")
  })

  it("flags a missing board and a completely disconnected part", () => {
    const checks = inspectCircuit([led], [], getDefinition, getPins)
    expect(checks.map((check) => check.id)).toContain("missing-board")
    expect(checks.map((check) => check.id)).toContain("no-wires")
    expect(checks.map((check) => check.id)).toContain("unwired-component-led-1")
  })

  it("identifies an unconnected required LED pin without claiming full electrical validation", () => {
    const wire: Wire = {
      id: "wire-1",
      fromComponentId: board.id,
      fromPinId: "board-1_D13",
      toComponentId: led.id,
      toPinId: "led-1_anode",
    }
    const checks = inspectCircuit([board, led], [wire], getDefinition, getPins)
    expect(checks.some((check) => check.id === "missing-pins-led-1")).toBe(true)
    expect(checks.some((check) => check.detail.includes("not a full electrical"))).toBe(false)
  })
})
