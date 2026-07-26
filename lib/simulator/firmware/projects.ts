import { BLINK_DEMO } from "./blink"

export interface SimulatorProject {
  id: string
  name: string
  description: string
  board: string
  hex: string
  source: string
  buildLog: string[]
}

/**
 * Registry of pre-built projects.
 *
 * - The toolbar's "Projects" dropdown lists everything in this array.
 * - `?project=<id>` in the simulator URL deep-links straight into one of
 *   them on load (see ProjectLoader).
 *
 * To add a new demo: build a `{ id, name, description, board, hex, source,
 * buildLog }` object (see blink.ts for the pattern) and push it in here.
 * The menu entry, URL support, compile console, and firmware run all pick
 * it up automatically — nothing else needs to change.
 */
export const PROJECTS: SimulatorProject[] = [BLINK_DEMO]

export function getProject(id: string | null | undefined): SimulatorProject | undefined {
  if (!id) return undefined
  return PROJECTS.find((p) => p.id === id)
}
