import { describe, expect, it } from "vitest"
import { mpu6050Definition } from "@/lib/simulator/components/mpu6050/definition"
import { simulateMpu6050 } from "@/lib/simulator/engine/component-simulation"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import type { PlacedComponent } from "@/types/simulator"

const pins = instantiatePins("imu", mpu6050Definition.pinTemplates)
const pinId = (name: string) => pins.find((pin) => pin.name === name)!.id
const sensor = (tiltX = 0, tiltY = 0): PlacedComponent => ({
  id: "imu", type: mpu6050Definition.type, name: mpu6050Definition.name,
  x: 0, y: 0, rotation: 0, metadata: { tiltX, tiltY },
})

describe("MPU-6050 visual IMU model", () => {
  it("exposes the common eight GY-521 header signals", () => {
    expect(mpu6050Definition.pinTemplates.map((pin) => pin.name)).toEqual(["vcc", "gnd", "scl", "sda", "xda", "xcl", "ad0", "int"])
  })
  it("reports powered when the sensor supply is in range", () => {
    const result = simulateMpu6050(sensor(), pins, { [pinId("vcc")]: 3.3, [pinId("gnd")]: 0 })
    expect(result.flags.powered).toBe(true)
  })
  it("maps tilt into a teaching gravity-vector approximation", () => {
    const result = simulateMpu6050(sensor(90, 0), pins, { [pinId("vcc")]: 3.3, [pinId("gnd")]: 0 })
    expect(result.flags.accelX).toBe(1)
    expect(result.flags.accelZ).toBe(0)
  })
})
