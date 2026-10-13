"use client"

import { useEffect, useRef } from "react"
import { getProject, type SimulatorProject } from "@/lib/simulator/firmware/projects"
import { getSavedCircuit } from "@/lib/simulator/saved-circuits"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"

const API = "https://www.solderhub.com/api/simulator/projects"
const ACTIVE_PROJECT_KEY = "solderhub-simulator:active-project-id"
const SOURCE_KEY = "solderhub-simulator:sketch-draft"

interface PublicSavedProject {
  id: string
  visibility: "private" | "public"
  circuit_data: { components?: unknown[]; wires?: unknown[]; code?: { source?: string } }
  firmware_hex?: string | null
  firmware_status?: string
  firmware_source_hash?: string | null
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/** Supports ?project= and ?demo= firmware demos, ?circuit= curated circuits, and ?saved= public cloud projects. */
export function ProjectLoader({
  onRequestProject,
  onUnknownProject,
  onSavedFirmware,
}: {
  onRequestProject: (project: SimulatorProject) => void
  onUnknownProject?: (id: string) => void
  onSavedFirmware?: (firmware: { componentId: string; hex: string }) => void
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
      if (circuit) dispatch({ type: "LOAD_STATE", state: { components: circuit.components, wires: circuit.wires } })
      else onUnknownProject?.(circuitId)
      return
    }

    const savedId = params.get("saved")
    if (savedId) {
      void (async () => {
        try {
          const response = await fetch(`${API}?id=${encodeURIComponent(savedId)}`, { credentials: "include", cache: "no-store" })
          const result = await response.json()
          const project = result.project as PublicSavedProject | undefined
          if (!response.ok || !project || project.visibility !== "public") { onUnknownProject?.(savedId); return }
          const components = project.circuit_data?.components
          const wires = project.circuit_data?.wires
          if (!Array.isArray(components) || !Array.isArray(wires)) { onUnknownProject?.(savedId); return }
          dispatch({ type: "LOAD_STATE", state: { components: components as never[], wires: wires as never[] } })
          const source = project.circuit_data?.code?.source
          if (typeof source === "string") {
            window.localStorage.setItem(SOURCE_KEY, source)
            window.dispatchEvent(new CustomEvent("solderhub:load-sketch", { detail: source }))
          }
          // Don't let a public article link accidentally overwrite a different
          // private project when the visitor next compiles code.
          window.localStorage.removeItem(ACTIVE_PROJECT_KEY)

          if (project.firmware_status === "compiled" && project.firmware_hex && project.firmware_source_hash && typeof source === "string") {
            if (await sha256(source) === project.firmware_source_hash) {
              const board = (components as Array<{ id?: string; type?: string }>).find((item) => item.type === "arduino-uno" && typeof item.id === "string")
              if (board?.id) {
                dispatch({ type: "SET_RUNNING", isRunning: true })
                onSavedFirmware?.({ componentId: board.id, hex: project.firmware_hex })
              }
            }
          }
        } catch { onUnknownProject?.(savedId) }
      })()
      return
    }

    const id = params.get("project") ?? params.get("demo")
    if (!id) return
    const project = getProject(id)
    if (project) onRequestProject(project)
    else onUnknownProject?.(id)
    // Intentionally run once: reflects the initial deep link only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
