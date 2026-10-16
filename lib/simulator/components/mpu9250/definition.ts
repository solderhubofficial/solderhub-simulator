import type { ComponentDefinition } from "@/types/simulator"
import { Mpu9250Renderer } from "@/components/simulator/components/mpu9250/renderer"
import { simulateMpu6050 } from "@/lib/simulator/engine/component-simulation"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"

/**
 * Original SolderHub MPU-9250 breakout artwork.
 * Orientation controls are an educational visualization only; this model does
 * not emulate I2C transactions, AK8963 magnetometer registers, or sensor fusion.
 */
export const mpu9250Definition: ComponentDefinition = {
  type: "mpu9250",
  name: "MPU-9250 9-Axis IMU",
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
  Renderer: Mpu9250Renderer,
}
