import { describe, expect, it } from "vitest"
import { inspectCircuit } from "@/lib/simulator/circuit-checks"
import type { ComponentDefinition, PlacedComponent, Wire } from "@/types/simulator"

const boardDefinition = { type: "arduino-uno", name: "Arduino Uno", category: "board" } as ComponentDefinition
const ledDefinition = { type: "led", name: "LED", category: "output" } as ComponentDefinition
const imuDefinition = { type: "mpu6050", name: "MPU-6050", category: "input" } as ComponentDefinition

const board: PlacedComponent = {
  id: "board-1", type: "arduino-uno", name: "Arduino Uno", x: 0, y: 0, rotation: 0, metadata: {},
}
const led: PlacedComponent = {
  id: "led-1", type: "led", name: "LED", x: 120, y: 0, rotation: 0, metadata: {},
}
const imu: PlacedComponent = {
  id: "imu-1", type: "mpu6050", name: "MPU-6050", x: 180, y: 0, rotation: 0, metadata: {},
}
const DEFINITIONS: Record<string, ComponentDefinition> = {
  "arduino-uno": boardDefinition,
  led: ledDefinition,
  mpu6050: imuDefinition,
}
const getDefinition = (type: string) => DEFINITIONS[type]
const getPins = (component: PlacedComponent) => {
  if (component.type === "led") {
    return [{ id: "led-1_anode", name: "anode" }, { id: "led-1_cathode", name: "cathode" }]
  }
  if (component.type === "mpu6050") {
    // The actual definition uses lowercase scl/sda labels.
    return [
      { id: "imu-1_vcc", name: "vcc" },
      { id: "imu-1_gnd", name: "gnd" },
      { id: "imu-1_scl", name: "scl" },
      { id: "imu-1_sda", name: "sda" },
    ]
  }
  return [{ id: "board-1_D13", name: "D13" }]
}

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
    expect(checks.find((check) => check.id === "missing-pins-led-1")?.detail).toContain("cathode")
  })

  it("matches MPU-6050 pin labels without relying on letter case", () => {
    const wire: Wire = {
      id: "wire-imu",
      fromComponentId: board.id,
      fromPinId: "board-1_D13",
      toComponentId: imu.id,
      toPinId: "imu-1_scl",
    }
    const checks = inspectCircuit([board, imu], [wire], getDefinition, getPins)
    expect(checks.find((check) => check.id === "missing-pins-imu-1")?.detail).toContain("SDA")
    expect(checks.some((check) => check.id === "pin-check-coverage-imu-1")).toBe(false)
  })

  it("flags a wire endpoint that points to a nonexistent pin", () => {
    const wire: Wire = {
      id: "wire-bad",
      fromComponentId: board.id,
      fromPinId: "board-1_NOT_A_PIN",
      toComponentId: led.id,
      toPinId: "led-1_anode",
    }
    const checks = inspectCircuit([board, led], [wire], getDefinition, getPins)
    expect(checks.some((check) => check.id === "invalid-wire-wire-bad-from")).toBe(true)
  })
})
