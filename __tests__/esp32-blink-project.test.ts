import { describe, expect, it } from "vitest"
import project from "@/examples/esp32/blink/blink-project.json"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { runSimulationTick } from "@/lib/simulator/engine/simulation-engine"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import { createEsp32GpioRuntimeAdapter } from "@/lib/simulator/esp32/gpio-runtime-adapter"
import { mapEsp32BoardPinToGpio } from "@/lib/simulator/esp32/board-adapter"
import { ESP32_BLINK_SKETCH } from "@/lib/simulator/esp32/sketches"
import { extractProjectSource } from "@/lib/simulator/project-code"
import { getEsp32Target } from "@/lib/simulator/esp32/targets"
import { boardTypeOf, familyOfType } from "@/lib/simulator/project-board"
import type { ComponentPin, PlacedComponent, Wire } from "@/types/simulator"

const components = project.components as PlacedComponent[]
const wires = project.wires as Wire[]

const simulate = (comps: PlacedComponent[]) => {
  const getPins = (c: PlacedComponent): ComponentPin[] => instantiatePins(c.id, getComponentDefinition(c.type)!.pinTemplates)
  return runSimulationTick(comps, wires, getComponentDefinition, getPins, true)
}
const withBoardMetadata = (metadata: Record<string, unknown>) =>
  components.map((c) => (c.type === "esp32-devkit" ? { ...c, metadata: { ...c.metadata, ...metadata } } : c))

describe("ESP32 Blink project (solderhub-simulator-project v1)", () => {
  it("uses the established project format, board and the acceptance-test firmware verbatim", () => {
    expect(project.format).toBe("solderhub-simulator-project")
    expect(project.version).toBe(1)
    expect(project.board).toBe("esp32-devkit")
    expect(project.code).toMatchObject({ language: "cpp", board: "esp32-devkit" })
    expect(extractProjectSource(project)).toBe(ESP32_BLINK_SKETCH)
    expect(ESP32_BLINK_SKETCH).toContain("#ifndef LED_BUILTIN\n#define LED_BUILTIN 2\n#endif")
    expect(boardTypeOf(components, null)).toBe("esp32-devkit")
    expect(familyOfType("esp32-devkit")).toBe("esp32")
    expect(getEsp32Target(project.board)).not.toBeNull()
  })

  it("only references registered components, existing pins and valid wire endpoints", () => {
    const ids = new Set<string>()
    for (const c of components) {
      expect(ids.has(c.id)).toBe(false)
      ids.add(c.id)
      expect(getComponentDefinition(c.type)).toBeDefined()
    }
    for (const w of wires) {
      for (const [cid, pid] of [[w.fromComponentId, w.fromPinId], [w.toComponentId, w.toPinId]]) {
        const comp = components.find((c) => c.id === cid)!
        expect(comp).toBeDefined()
        const pinNames = getComponentDefinition(comp.type)!.pinTemplates.map((p) => `${comp.id}_${p.name}`)
        expect(pinNames).toContain(pid)
      }
    }
  })

  it("maps the wired header pin to the GPIO the firmware drives", () => {
    const toBoard = wires.find((w) => w.fromComponentId === "esp32-1" || w.toComponentId === "esp32-1")!
    expect(toBoard.fromPinId).toBe("esp32-1_IO2")
    expect(mapEsp32BoardPinToGpio("esp32-devkit", "IO2")).toMatchObject({ gpio: 2, inputOnly: false, bootStrapping: true })
  })

  it("the LED follows firmware GPIO events through the real adapter and engine, at 3.3 V", () => {
    let metadata: Record<string, unknown> = { ...components[0].metadata }
    const adapter = createEsp32GpioRuntimeAdapter({ boardType: "esp32-devkit", onPinValues: () => {}, onPinState: (s) => { metadata = { ...metadata, ...s } } })
    adapter.reset()
    const lit = () => simulate(withBoardMetadata(metadata)).led1.flags.isOn
    const msg = (level: 0 | 1) => ({ channel: "solderhub:esp32-bridge", version: 1, type: "gpio", pin: 2, level })

    expect(lit()).toBe(false) // firmware has not driven the pin yet
    adapter.consume(msg(1)); expect(lit()).toBe(true)
    adapter.consume(msg(0)); expect(lit()).toBe(false)
    adapter.consume(msg(1)); expect(lit()).toBe(true)
  })

  it("stays dark when the pin is not an OUTPUT, and after the adapter resets (Stop)", () => {
    expect(simulate(withBoardMetadata({ pinModes: {}, pinValues: { IO2: 1 } })).led1.flags.isOn).toBe(false)
    expect(simulate(withBoardMetadata({ pinModes: { IO2: "OUTPUT" }, pinValues: { IO2: 1 } })).led1.flags.isOn).toBe(true)
    expect(simulate(withBoardMetadata({ pinModes: {}, pinValues: {} })).led1.flags.isOn).toBe(false)
  })
})
