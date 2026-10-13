import type { PlacedComponent, Wire } from "@/types/simulator"

/**
 * Curated, version-controlled canvas projects.
 *
 * Intentionally empty: simulator projects should come from saved user/article
 * records, not hard-coded demo circuits.
 */
export interface SavedCircuitDefinition {
  id: string
  title: string
  description: string
  version: 1
  components: PlacedComponent[]
  wires: Wire[]
}

const SAVED_CIRCUITS: Record<string, SavedCircuitDefinition> = {}

export function getSavedCircuit(id: string): SavedCircuitDefinition | undefined {
  return SAVED_CIRCUITS[id]
}

export function getSavedCircuitIds(): string[] {
  return Object.keys(SAVED_CIRCUITS)
}
