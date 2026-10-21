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
  height: 127.5,
  pinTemplates: [
    { name: "vcc", type: "power", x: 155.0, y: 12.0 },
    { name: "gnd", type: "ground", x: 135.0, y: 12.0 },
    { name: "scl", type: "digital", x: 115.0, y: 12.0 },
    { name: "sda", type: "digital", x: 95.0, y: 12.0 },
    { name: "xda", type: "digital", x: 75.0, y: 12.0 },
    { name: "xcl", type: "digital", x: 55.0, y: 12.0 },
    { name: "ad0", type: "digital", x: 35.2, y: 12.0 },
    { name: "int", type: "digital", x: 15.2, y: 12.0 },
  ],
  defaultMetadata: { tiltX: 0, tiltY: 0, i2cAddress: "0x68" },
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateMpu6050,
  Renderer: Mpu6050Renderer,
}
