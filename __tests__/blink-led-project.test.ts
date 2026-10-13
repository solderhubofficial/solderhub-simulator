import { describe, expect, it } from "vitest"
import { AVRIOPort, CPU, avrInstruction, portBConfig } from "avr8js"
import { BLINK_LED_PROJECT } from "@/lib/simulator/firmware/blink-led"
import { PROJECTS, getProject } from "@/lib/simulator/firmware/projects"
import { circuitBounds, fitViewport, instantiateCircuit } from "@/lib/simulator/firmware/circuit"
import { loadIntelHex } from "@/lib/simulator/firmware/hex-loader"
import { runSimulationTick } from "@/lib/simulator/engine/simulation-engine"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import { getComponentBounds, getPinWorldPosition } from "@/lib/simulator/utils/geometry"
import { pinExitDirection, routeWire, type Rect } from "@/lib/simulator/utils/wire-routing"
import type { PlacedComponent } from "@/types/simulator"

const circuit = BLINK_LED_PROJECT.circuit!

function getPins(component: PlacedComponent) {
  return instantiatePins(component.id, getComponentDefinition(component.type)!.pinTemplates)
}

/** Runs the project's circuit one tick with D13 forced to `level` (volts model: HIGH=1). */
function ledIsOn(d13: 0 | 1): boolean {
  const { components, wires, boardId } = instantiateCircuit(circuit)
  const board = components.find((c) => c.id === boardId)!
  board.metadata = {
    ...board.metadata,
    pinModes: { D13: "OUTPUT" },
    pinValues: { D13: d13 },
  }
  const results = runSimulationTick(components, wires, getComponentDefinition, getPins, true)
  const led = components.find((c) => c.type === "led")!
  return results[led.id].flags.isOn === true
}

describe("blink-led project definition", () => {
  it("is registered and reachable through ?project=blink-led", () => {
    expect(PROJECTS.map((p) => p.id)).toContain("blink-led")
    expect(getProject("blink-led")).toBe(BLINK_LED_PROJECT)
  })

  it("instantiates with valid parts, pins and wires", () => {
    const { components, wires, boardId } = instantiateCircuit(circuit)
    expect(components.map((c) => c.type).sort()).toEqual(["arduino-uno", "led", "resistor"])
    expect(wires).toHaveLength(3)
    expect(components.find((c) => c.id === boardId)?.type).toBe("arduino-uno")

    const ids = new Set(components.map((c) => c.id))
    for (const wire of wires) {
      expect(ids.has(wire.fromComponentId)).toBe(true)
      expect(ids.has(wire.toComponentId)).toBe(true)
    }
  })

  it("rejects typos in a circuit instead of silently dropping them", () => {
    expect(() =>
      instantiateCircuit({
        board: "uno",
        parts: [{ key: "uno", type: "arduino-uno", x: 0, y: 0 }],
        wires: [{ from: ["uno", "D99"], to: ["uno", "D13"] }],
      }),
    ).toThrow(/no pin named "D99"/)
    expect(() =>
      instantiateCircuit({ board: "uno", parts: [{ key: "uno", type: "no-such-part", x: 0, y: 0 }], wires: [] }),
    ).toThrow(/unknown component type/)
  })
})

describe("blink-led electrical behaviour", () => {
  it("lights the LED when D13 is HIGH and turns it off when D13 is LOW", () => {
    expect(ledIsOn(1)).toBe(true)
    expect(ledIsOn(0)).toBe(false)
  })
})

describe("blink-led firmware", () => {
  it("really toggles D13 (PB5) about every 500 ms when the hex runs on an emulated ATmega328P", () => {
    const flash = new Uint16Array(0x8000)
    loadIntelHex(BLINK_LED_PROJECT.hex, new Uint8Array(flash.buffer))
    const cpu = new CPU(flash)
    const portB = new AVRIOPort(cpu, portBConfig)

    const CPU_HZ = 16_000_000
    const edges: { atMs: number; high: boolean }[] = []
    let last = false
    portB.addListener((value) => {
      const high = (value & (1 << 5)) !== 0
      if (high !== last) {
        last = high
        edges.push({ atMs: (cpu.cycles / CPU_HZ) * 1000, high })
      }
    })

    const endCycle = CPU_HZ * 2.2 // ~2.2 s of emulated time
    while (cpu.cycles < endCycle) {
      avrInstruction(cpu)
      cpu.tick()
    }

    // Starts LOW, goes HIGH at ~0 ms, LOW at ~500, HIGH at ~1000, LOW at ~1500, HIGH at ~2000.
    expect(edges.length).toBeGreaterThanOrEqual(4)
    for (let i = 1; i < edges.length; i++) {
      const gap = edges[i].atMs - edges[i - 1].atMs
      expect(gap).toBeGreaterThan(480)
      expect(gap).toBeLessThan(520)
      expect(edges[i].high).toBe(!edges[i - 1].high)
    }
  })
})

describe("blink-led layout", () => {
  const { components, wires } = instantiateCircuit(circuit)
  const rectOf = (component: PlacedComponent): Rect => {
    const def = getComponentDefinition(component.type)!
    return getComponentBounds(component, def.width, def.height)
  }
  const obstacles = components.map(rectOf)

  it("keeps the middle of every wire out of other parts (no wire cuts across the board)", () => {
    for (const wire of wires) {
      const fromComp = components.find((c) => c.id === wire.fromComponentId)!
      const toComp = components.find((c) => c.id === wire.toComponentId)!
      const endpoint = (comp: PlacedComponent, pinId: string) => {
        const pin = getPins(comp).find((p) => p.id === pinId)!
        const pos = getPinWorldPosition(comp, pin)
        return { ...pos, dir: pinExitDirection(pos, rectOf(comp)) }
      }
      const routed = routeWire(endpoint(fromComp, wire.fromPinId), endpoint(toComp, wire.toPinId), obstacles, wire.route)

      // Skip the first and last segments: those start/end inside their own
      // part's bounds by design (the pin sits at the part's edge).
      for (let i = 1; i < routed.points.length - 2; i++) {
        const p = routed.points[i]
        const q = routed.points[i + 1]
        for (const r of obstacles) {
          const hits =
            Math.max(p.x, q.x) > r.left &&
            Math.min(p.x, q.x) < r.right &&
            Math.max(p.y, q.y) > r.top &&
            Math.min(p.y, q.y) < r.bottom
          expect(hits, `wire ${wire.id} segment ${i} crosses a part`).toBe(false)
        }
      }
    }
  })

  it("fits the whole circuit inside a small embed frame", () => {
    const bounds = circuitBounds(components)!
    const viewport = fitViewport(components, 640, 420)!
    expect(viewport.zoom).toBeGreaterThan(0)
    expect(viewport.zoom).toBeLessThanOrEqual(1)
    const left = bounds.left * viewport.zoom + viewport.x
    const right = bounds.right * viewport.zoom + viewport.x
    const top = bounds.top * viewport.zoom + viewport.y
    const bottom = bounds.bottom * viewport.zoom + viewport.y
    expect(left).toBeGreaterThanOrEqual(0)
    expect(top).toBeGreaterThanOrEqual(0)
    expect(right).toBeLessThanOrEqual(640)
    expect(bottom).toBeLessThanOrEqual(420)
  })
})
