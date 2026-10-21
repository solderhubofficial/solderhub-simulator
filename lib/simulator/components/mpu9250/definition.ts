import type { ComponentDefinition } from "@/types/simulator"
import { Mpu9250Renderer } from "@/components/simulator/components/mpu9250/renderer"
import { simulateMpu9250 } from "@/lib/simulator/engine/component-simulation"
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
  simulate: simulateMpu9250,
  Renderer: Mpu9250Renderer,
}
