import { describe, expect, it } from "vitest"
import { raspberryPi5Definition } from "@/lib/simulator/components/raspberry-pi-5/definition"
import { getComponentDefinition } from "@/lib/simulator/registry"

describe("Raspberry Pi 5 Velxio board layout", () => {
  it("registers the Pi 5 as a board with all 40 physical GPIO header pins", () => {
    expect(getComponentDefinition("raspberry-pi-5")).toBe(raspberryPi5Definition)
    expect(raspberryPi5Definition.category).toBe("board")
    expect(raspberryPi5Definition.pinTemplates).toHaveLength(40)
  })

  it("keeps physical pin numbering and coordinates aligned to the source image", () => {
    const pins = raspberryPi5Definition.pinTemplates
    const scale = 330 / 1024
    expect(pins[0]).toMatchObject({ name: "3V3", x: 103 * scale, y: 32 * scale, type: "power" })
    expect(pins[1]).toMatchObject({ name: "5V", x: 103 * scale, y: 61 * scale, type: "power" })
    expect(pins[2]).toMatchObject({ name: "GPIO2", x: (103 + 26) * scale, y: 32 * scale, type: "digital" })
    expect(pins[26].name).toBe("ID_SD")
    expect(pins[27].name).toBe("ID_SC")
    expect(pins[38].name).toBe("GND_8")
    expect(pins[39]).toMatchObject({ name: "GPIO21", x: (103 + 19 * 26) * scale, y: 61 * scale, type: "digital" })
  })
})
