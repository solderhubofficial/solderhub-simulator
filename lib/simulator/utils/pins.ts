import type { ComponentDefinition, ComponentPin, PinTemplate, PlacedComponent } from "@/types/simulator"

/** Instantiate pin templates with unique IDs for a placed component */
export function instantiatePins(
  componentId: string,
  templates: PinTemplate[]
): ComponentPin[] {
  return templates.map((t) => ({
    id: `${componentId}_${t.name}`,
    name: t.name,
    type: t.type,
    x: t.x,
    y: t.y,
  }))
}

/** Default pin connection rule: power↔passive/analog/digital, ground↔same, no power↔ground */
export function defaultCanConnectPins(
  fromType: ComponentPin["type"],
  toType: ComponentPin["type"]
): boolean {
  if (fromType === "ground" && toType === "power") return false
  if (fromType === "power" && toType === "ground") return false
  return true
}

import { generateId } from "@/lib/simulator/utils/id"

/** Create a placed component from a definition at the given position */
export function createPlacedComponent(
  definition: ComponentDefinition,
  x: number,
  y: number
): PlacedComponent {
  const id = generateId("comp")
  return {
    id,
    type: definition.type,
    name: definition.name,
    x,
    y,
    rotation: 0,
    metadata: { ...definition.defaultMetadata },
  }
}
