import { describe, expect, it } from "vitest"
import { mpu9250Definition } from "@/lib/simulator/components/mpu9250/definition"
import { simulateMpu9250 } from "@/lib/simulator/engine/component-simulation"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import type { PlacedComponent } from "@/types/simulator"

const pins = instantiatePins("imu", mpu9250Definition.pinTemplates)
const pinId = (name: string) => pins.find((pin) => pin.name === name)!.id
const sensor = (tiltX = 0, tiltY = 0): PlacedComponent => ({
  id: "imu", type: mpu9250Definition.type, name: mpu9250Definition.name,
  x: 0, y: 0, rotation: 0, metadata: { tiltX, tiltY, i2cAddress: "0x68" },
})

describe("MPU-9250 visual IMU model", () => {
  it("exposes the common eight-pin breakout header", () => {
    expect(mpu9250Definition.pinTemplates.map((pin) => pin.name)).toEqual([
      "vcc", "gnd", "scl", "sda", "xda", "xcl", "ad0", "int",
    ])
  })
  it("reports powered with a valid 3.3 V supply", () => {
    const result = simulateMpu9250(sensor(), pins, {
      [pinId("vcc")]: 3.3, [pinId("gnd")]: 0,
    })
    expect(result.flags.powered).toBe(true)
    expect(result.flags.visualModelOnly).toBe(true)
    expect(result.flags.magnetometerEmulated).toBe(false)
  })
  it("maps tilt into a teaching gravity-vector approximation", () => {
    const result = simulateMpu9250(sensor(90, 0), pins, {
      [pinId("vcc")]: 3.3, [pinId("gnd")]: 0,
    })
    expect(result.flags.accelX).toBe(1)
    expect(result.flags.accelZ).toBe(0)
  })
})
