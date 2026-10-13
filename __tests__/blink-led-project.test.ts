import { describe, expect, it } from "vitest"
import { AVRIOPort, CPU, avrInstruction, portBConfig } from "avr8js"
import { BLINK_LED_PROJECT } from "@/lib/simulator/firmware/blink-led"
import { PROJECTS, getProject } from "@/lib/simulator/firmware/projects"
import { circuitBounds, fitViewport, instantiateCircuit } from "@/lib/simulator/firmware/circuit"
import { loadIntelHex } from "@/lib/simulator/firmware/hex-loader"
import { BLINK_HEX } from "@/lib/simulator/firmware/blink"
import { readPort } from "@/lib/simulator/avr/port-state"
import { compileSketch, hashSource } from "@/lib/simulator/compile-client"
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

/** Runs the project's circuit one tick with the Uno's D9 set as an OUTPUT at `level`. */
function ledIsOn(d9: 0 | 1, mode: "OUTPUT" | "INPUT" = "OUTPUT"): boolean {
  const { components, wires, boardId } = instantiateCircuit(circuit)
  const board = components.find((c) => c.id === boardId)!
  board.metadata = {
    ...board.metadata,
    pinModes: { D9: mode },
    pinValues: { D9: d9 },
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
  it("lights the LED when D9 is driven HIGH and turns it off when D9 is LOW", () => {
    expect(ledIsOn(1)).toBe(true)
    expect(ledIsOn(0)).toBe(false)
  })

  it("does not light the LED while D9 is still an INPUT (before pinMode runs)", () => {
    expect(ledIsOn(1, "INPUT")).toBe(false)
  })

  it("starts with nothing driven, so no stray pin lights the LED before the sketch runs", () => {
    const { components, wires } = instantiateCircuit(circuit)
    const results = runSimulationTick(components, wires, getComponentDefinition, getPins, true)
    const led = components.find((c) => c.type === "led")!
    expect(results[led.id].flags.isOn).toBe(false)
  })
})

describe("blink-led firmware path", () => {
  it("ships the guide's sketch (pin 9, Serial) and compiles it on load instead of using a stale hex", () => {
    expect(BLINK_LED_PROJECT.hex).toBeUndefined()
    expect(BLINK_LED_PROJECT.source).toContain("#define LED_PIN   9")
    expect(BLINK_LED_PROJECT.source).toContain('Serial.println("LED ON")')
  })

  it("tracks pin direction from DDR so a sketch can drive any pin: an LED on D9 follows PB1", () => {
    // Hand-assembled ATmega328P program:
    //   sbi DDRB,1 ; loop: sbi PORTB,1 ; cbi PORTB,1 ; rjmp loop
    const words = [0x9a21, 0x9a29, 0x9829, 0xcffd]
    const flash = new Uint16Array(0x8000)
    words.forEach((w, i) => (flash[i] = w))
    const cpu = new CPU(flash)
    const portB = new AVRIOPort(cpu, portBConfig)
    const PORTB_NAMES = ["D8", "D9", "D10", "D11", "D12", "D13"]

    const { components, wires, boardId } = instantiateCircuit(circuit)
    const led = components.find((c) => c.type === "led")!
    const apply = () => {
      const snapshot = readPort(portB, PORTB_NAMES)
      const board = components.find((c) => c.id === boardId)!
      board.metadata = {
        ...board.metadata,
        pinModes: snapshot.modes,
        pinValues: Object.fromEntries(Object.entries(snapshot.levels).map(([k, v]) => [k, v ? 1 : 0])),
      }
      return snapshot
    }
    const ledOn = () =>
      runSimulationTick(components, wires, getComponentDefinition, getPins, true)[led.id].flags.isOn === true
    const step = () => {
      avrInstruction(cpu)
      cpu.tick()
    }

    // Reset state: every pin is an input, LED dark.
    expect(apply().modes.D9).toBe("INPUT")
    expect(ledOn()).toBe(false)

    step() // sbi DDRB,1  -> D9 becomes an OUTPUT (LOW)
    const afterDdr = apply()
    expect(afterDdr.modes.D9).toBe("OUTPUT")
    expect(afterDdr.levels.D9).toBe(false)
    expect(afterDdr.modes.D13).toBe("INPUT")
    expect(ledOn()).toBe(false)

    step() // sbi PORTB,1 -> D9 HIGH
    expect(apply().levels.D9).toBe(true)
    expect(ledOn()).toBe(true)

    step() // cbi PORTB,1 -> D9 LOW
    expect(apply().levels.D9).toBe(false)
    expect(ledOn()).toBe(false)
  })

  it("the stock Blink image really toggles PB5 about every 500 ms on the emulated chip", () => {
    const flash = new Uint16Array(0x8000)
    loadIntelHex(BLINK_HEX, new Uint8Array(flash.buffer))
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

    const endCycle = CPU_HZ * 2.2
    while (cpu.cycles < endCycle) {
      avrInstruction(cpu)
      cpu.tick()
    }

    expect(edges.length).toBeGreaterThanOrEqual(4)
    for (let i = 1; i < edges.length; i++) {
      const gap = edges[i].atMs - edges[i - 1].atMs
      expect(gap).toBeGreaterThan(480)
      expect(gap).toBeLessThan(520)
      expect(edges[i].high).toBe(!edges[i - 1].high)
    }
  })
})

describe("compile client", () => {
  const ok = (body: unknown, status = 200) =>
    (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

  it("returns the hex from /api/compile", async () => {
    let seenBody = ""
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      seenBody = String(init.body)
      return new Response(JSON.stringify({ hex: ":00000001FF" }), { status: 200 })
    }) as unknown as typeof fetch
    expect(await compileSketch("void setup(){}", fetchImpl)).toEqual({ ok: true, hex: ":00000001FF" })
    expect(JSON.parse(seenBody)).toEqual({ source: "void setup(){}" })
  })

  it("surfaces compiler errors verbatim", async () => {
    const result = await compileSketch("oops", ok({ error: "sketch.ino:1: error: expected ..." }, 400))
    expect(result).toEqual({ ok: false, error: "sketch.ino:1: error: expected ..." })
  })

  it("reports an unreachable service and an empty response clearly", async () => {
    const down = (async () => {
      throw new Error("network")
    }) as unknown as typeof fetch
    expect((await compileSketch("a", down)).ok).toBe(false)
    expect(await compileSketch("b", ok({}))).toEqual({
      ok: false,
      error: "The compile service returned no firmware.",
    })
  })

  it("hashes different sketches differently and the same sketch identically", () => {
    expect(hashSource("abc")).toBe(hashSource("abc"))
    expect(hashSource("abc")).not.toBe(hashSource("abd"))
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
