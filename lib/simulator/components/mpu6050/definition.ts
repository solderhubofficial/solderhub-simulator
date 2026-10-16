import type { ComponentDefinition } from "@/types/simulator"
import { Mpu6050Renderer } from "@/components/simulator/components/mpu6050/renderer"
import { simulateMpu6050 } from "@/lib/simulator/engine/component-simulation"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"

/**
 * GY-521-style MPU-6050 IMU module. Header order varies between breakout
 * revisions; always follow the silkscreen. Orientation controls are visual
 * teaching aids and do not emulate the sensor's I2C register protocol.
 */
export const mpu6050Definition: ComponentDefinition = {
  type: "mpu6050",
  name: "MPU-6050 IMU (GY-521)",
  category: "input",
  width: 170,
  height: 130,
  pinTemplates: [
    { name: "vcc", type: "power", x: 22, y: 124 },
    { name: "gnd", type: "ground", x: 40, y: 124 },
    { name: "scl", type: "digital", x: 58, y: 124 },
    { name: "sda", type: "digital", x: 76, y: 124 },
    { name: "xda", type: "digital", x: 94, y: 124 },
    { name: "xcl", type: "digital", x: 112, y: 124 },
    { name: "ad0", type: "digital", x: 130, y: 124 },
    { name: "int", type: "digital", x: 148, y: 124 },
  ],
  defaultMetadata: { tiltX: 0, tiltY: 0, i2cAddress: "0x68" },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateMpu6050,
  Renderer: Mpu6050Renderer,
}
