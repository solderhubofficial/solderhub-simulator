import { describe, expect, it } from "vitest"
import { rotateAboutCenter } from "@/lib/simulator/utils/geometry"
import { simulatorReducer, initialCanvasState } from "@/lib/simulator/reducer"
import { getComponentDefinition } from "@/lib/simulator/registry"
import type { PlacedComponent } from "@/types/simulator"

const centre = (c: { x: number; y: number; rotation: 0 | 90 | 180 | 270 }, w: number, h: number) => {
  const r = { 0: [w / 2, h / 2], 90: [-h / 2, w / 2], 180: [-w / 2, -h / 2], 270: [h / 2, -w / 2] }[c.rotation]
  return { x: c.x + r[0], y: c.y + r[1] }
}

describe("rotateAboutCenter", () => {
  it("keeps the visual centre fixed through a full turn, in both directions", () => {
    const size = { width: 120, height: 40 }
    let part = { x: 300, y: 200, rotation: 0 as 0 | 90 | 180 | 270 }
    const start = centre(part, size.width, size.height)
    for (let i = 0; i < 4; i++) {
      part = rotateAboutCenter(part, size)
      const c = centre(part, size.width, size.height)
      expect(c.x).toBeCloseTo(start.x); expect(c.y).toBeCloseTo(start.y)
    }
    expect(part.rotation).toBe(0)
    expect(part.x).toBeCloseTo(300); expect(part.y).toBeCloseTo(200)
    const ccw = rotateAboutCenter({ x: 300, y: 200, rotation: 0 }, size, -1)
    expect(ccw.rotation).toBe(270)
    const c = centre(ccw, size.width, size.height)
    expect(c.x).toBeCloseTo(start.x); expect(c.y).toBeCloseTo(start.y)
  })
})

describe("ROTATE_COMPONENT", () => {
  it("rotates every registered part in place: the pins' centroid does not move", () => {
    for (const type of ["led", "resistor", "esp32-devkit", "arduino-uno", "push-button"]) {
      const def = getComponentDefinition(type)!
      const placed: PlacedComponent = { id: "p", type, name: def.name, x: 400, y: 300, rotation: 0, metadata: { ...def.defaultMetadata } } as PlacedComponent
      let state = { ...initialCanvasState, components: [placed] }
      const bodyCentre = (c: PlacedComponent) => centre(c as never, def.width, def.height)
      const c0 = bodyCentre(state.components[0])
      for (let i = 0; i < 4; i++) {
        state = simulatorReducer(state, { type: "ROTATE_COMPONENT", id: "p" })
        const c = bodyCentre(state.components[0])
        expect(c.x).toBeCloseTo(c0.x); expect(c.y).toBeCloseTo(c0.y)
      }
      expect(state.components[0].rotation).toBe(0)
    }
  })
})
