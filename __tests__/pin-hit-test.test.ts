import { afterEach, describe, expect, it, vi } from "vitest"
import { pinElementAt } from "@/components/simulator/canvas/pin-hit-test"

const el = (pinId?: string) => ({ closest: (sel: string) => (sel === "[data-pin-id]" && pinId ? { pinId } : null) })

describe("pinElementAt", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("looks through a wire stroke lying above a pin", () => {
    vi.stubGlobal("document", { elementsFromPoint: () => [el(), el("anode"), el()] })
    expect(pinElementAt(1, 1)).toEqual({ pinId: "anode" })
  })

  it("returns null when no pin is under the point", () => {
    vi.stubGlobal("document", { elementsFromPoint: () => [el(), el()] })
    expect(pinElementAt(1, 1)).toBeNull()
  })
})
