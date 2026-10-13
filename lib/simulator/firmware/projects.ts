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
 * Keep this empty unless a project is intentionally maintained as a built-in
 * demo. Real user/article projects should be loaded from the saved-project
 * store rather than hard-coded into the simulator bundle.
 */
export const PROJECTS: SimulatorProject[] = []

export function getProject(id: string | null | undefined): SimulatorProject | undefined {
  if (!id) return undefined
  return PROJECTS.find((p) => p.id === id)
}
