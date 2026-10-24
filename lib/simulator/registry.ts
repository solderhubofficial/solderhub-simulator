import type { ComponentDefinition, ComponentPaletteItem } from "@/types/simulator"
import { arduinoUnoDefinition } from "@/lib/simulator/components/arduino-uno/definition"
import { esp32DevkitDefinition } from "@/lib/simulator/components/esp32-devkit/definition"
import { arduinoNanoDefinition, arduinoMegaDefinition, nodemcuDefinition, esp32C3Definition, bluePillDefinition, blackPillDefinition, picoDefinition } from "@/lib/simulator/components/board-expansion/definition"
import { raspberryPi5Definition } from "@/lib/simulator/components/raspberry-pi-5/definition"
import { breadboardDefinition } from "@/lib/simulator/components/breadboard/definition"
import { ledDefinition } from "@/lib/simulator/components/led/definition"
import { resistorDefinition } from "@/lib/simulator/components/resistor/definition"
import { pushButtonDefinition } from "@/lib/simulator/components/push-button/definition"
import { buzzerDefinition } from "@/lib/simulator/components/buzzer/definition"
import { relayDefinition } from "@/lib/simulator/components/relay/definition"
import { potentiometerDefinition } from "@/lib/simulator/components/potentiometer/definition"
import { dht11Definition } from "@/lib/simulator/components/dht11/definition"
import { dht22Definition } from "@/lib/simulator/components/dht22/definition"
import { ds18b20Definition } from "@/lib/simulator/components/ds18b20/definition"
import { lcd1602Definition } from "@/lib/simulator/components/lcd1602/definition"
import { lcd1602ParallelDefinition } from "@/lib/simulator/components/lcd1602-parallel/definition"
import { batteryDefinition } from "@/lib/simulator/components/battery/definition"
import { slideSwitchDefinition } from "@/lib/simulator/components/slide-switch/definition"
import { speakerDefinition } from "@/lib/simulator/components/speaker/definition"
import { hcSr04Definition } from "@/lib/simulator/components/hc-sr04/definition"
import { servoDefinition } from "@/lib/simulator/components/servo/definition"
import { tiltSwitchDefinition } from "@/lib/simulator/components/tilt-switch/definition"
import { rgbLedDefinition } from "@/lib/simulator/components/rgb-led/definition"
import { irReceiverDefinition } from "@/lib/simulator/components/ir-receiver/definition"
import { a3144Definition } from "@/lib/simulator/components/a3144/definition"
import { hcSr501Definition } from "@/lib/simulator/components/hc-sr501/definition"
import { mpu6050Definition } from "@/lib/simulator/components/mpu6050/definition"
import { mpu9250Definition } from "@/lib/simulator/components/mpu9250/definition"
import { mq3Definition } from "@/lib/simulator/components/mq3/definition"
import { oled13Definition } from "@/lib/simulator/components/oled-13/definition"
import { junctionDefinition } from "@/lib/simulator/components/junction/definition"
import { rc522Definition } from "@/lib/simulator/components/rc522/definition"

const DEFINITIONS: ComponentDefinition[] = [
  arduinoUnoDefinition,
  esp32DevkitDefinition,
  arduinoNanoDefinition,
  arduinoMegaDefinition,
  nodemcuDefinition,
  esp32C3Definition,
  bluePillDefinition,
  blackPillDefinition,
  picoDefinition,
  raspberryPi5Definition,
  breadboardDefinition,
  ledDefinition,
  resistorDefinition,
  pushButtonDefinition,
  buzzerDefinition,
  relayDefinition,
  potentiometerDefinition,
  dht11Definition,
  dht22Definition,
  ds18b20Definition,
  lcd1602Definition,
  lcd1602ParallelDefinition,
  batteryDefinition,
  slideSwitchDefinition,
  speakerDefinition,
  hcSr04Definition,
  servoDefinition,
  tiltSwitchDefinition,
  rgbLedDefinition,
  irReceiverDefinition,
  a3144Definition,
  hcSr501Definition,
  mpu6050Definition,
  mpu9250Definition,
  mq3Definition,
  oled13Definition,
  rc522Definition,
  junctionDefinition,
]

const registry = new Map<string, ComponentDefinition>(
  DEFINITIONS.map((d) => [d.type, d])
)

export function getComponentDefinition(type: string): ComponentDefinition | undefined {
  return registry.get(type)
}

export function getAllDefinitions(): ComponentDefinition[] {
  return DEFINITIONS
}

export function getPaletteItems(): ComponentPaletteItem[] {
  return DEFINITIONS.filter((d) => d.type !== "junction").map((d) => ({
    type: d.type,
    name: d.name,
    category: d.category,
  }))
}

export function registerComponent(definition: ComponentDefinition): void {
  registry.set(definition.type, definition)
}
