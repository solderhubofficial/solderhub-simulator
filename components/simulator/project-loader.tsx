"use client"

import { useEffect, useRef } from "react"
import { getProject, type SimulatorProject } from "@/lib/simulator/firmware/projects"
import { getSavedCircuit } from "@/lib/simulator/saved-circuits"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"

/**
 * Deep links:
 * - ?project=<id> loads an existing firmware/demo project.
 * - ?circuit=<id> loads a curated visual canvas circuit.
 * - ?demo=<id> remains an alias for older firmware project links.
 */
export function ProjectLoader({
  onRequestProject,
  onUnknownProject,
}: {
  onRequestProject: (project: SimulatorProject) => void
  onUnknownProject?: (id: string) => void
}) {
  const triedRef = useRef(false)
  const { dispatch } = useSimulator()

  useEffect(() => {
    if (triedRef.current) return
    triedRef.current = true

    const params = new URLSearchParams(window.location.search)
    const circuitId = params.get("circuit")

    if (circuitId) {
      const circuit = getSavedCircuit(circuitId)
      if (circuit) {
        dispatch({
          type: "LOAD_STATE",
          state: { components: circuit.components, wires: circuit.wires },
        })
      } else {
        onUnknownProject?.(circuitId)
      }
      return
    }

    const id = params.get("project") ?? params.get("demo")
    if (!id) return

    const project = getProject(id)
    if (project) {
      onRequestProject(project)
    } else {
      onUnknownProject?.(id)
    }
    // Intentionally run once: reflects the initial deep link only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
