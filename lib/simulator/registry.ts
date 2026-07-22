import type { ComponentDefinition, ComponentPaletteItem } from "@/types/simulator"
import { arduinoUnoDefinition } from "@/lib/simulator/components/arduino-uno/definition"
import { esp32DevkitDefinition } from "@/lib/simulator/components/esp32-devkit/definition"
import { breadboardDefinition } from "@/lib/simulator/components/breadboard/definition"
import { ledDefinition } from "@/lib/simulator/components/led/definition"
import { resistorDefinition } from "@/lib/simulator/components/resistor/definition"
import { pushButtonDefinition } from "@/lib/simulator/components/push-button/definition"
import { buzzerDefinition } from "@/lib/simulator/components/buzzer/definition"
import { relayDefinition } from "@/lib/simulator/components/relay/definition"
import { potentiometerDefinition } from "@/lib/simulator/components/potentiometer/definition"

const DEFINITIONS: ComponentDefinition[] = [
  arduinoUnoDefinition,
  esp32DevkitDefinition,
  breadboardDefinition,
  ledDefinition,
  resistorDefinition,
  pushButtonDefinition,
  buzzerDefinition,
  relayDefinition,
  potentiometerDefinition,
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
  return DEFINITIONS.map((d) => ({
    type: d.type,
    name: d.name,
    category: d.category,
  }))
}

export function registerComponent(definition: ComponentDefinition): void {
  registry.set(definition.type, definition)
}
