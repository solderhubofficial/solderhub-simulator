"use client"

import { useEffect, useState } from "react"
import { Folder, Save, Trash2, X, ArrowUpRight } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import type { PlacedComponent, Wire } from "@/types/simulator"

const STORAGE_KEY = "solderhub-simulator:my-projects:v1"

interface SavedCircuit {
  id: string
  name: string
  savedAt: string
  components: PlacedComponent[]
  wires: Wire[]
}

function readProjects(): SavedCircuit[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")
    if (!Array.isArray(value)) return []
    return value.filter(
      (item): item is SavedCircuit =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        Array.isArray(item.components) &&
        Array.isArray(item.wires),
    )
  } catch {
    return []
  }
}

export function MyProjectsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useSimulator()
  const [projects, setProjects] = useState<SavedCircuit[]>([])
  const [projectName, setProjectName] = useState("My circuit")
  const [storageError, setStorageError] = useState<string | null>(null)

  useEffect(() => {
    setProjects(readProjects())
  }, [])

  if (!open) return null

  const persist = (next: SavedCircuit[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setProjects(next)
      setStorageError(null)
      return true
    } catch {
      setStorageError("Browser storage is unavailable. Your project was not saved.")
      return false
    }
  }

  const saveCurrent = () => {
    const name = projectName.trim()
    if (!name || state.components.length === 0) return
    const entry: SavedCircuit = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `circuit-${Date.now()}`,
      name,
      savedAt: new Date().toISOString(),
      components: state.components,
      wires: state.wires,
    }
    if (persist([entry, ...projects].slice(0, 50))) setProjectName("My circuit")
  }

  const loadProject = (project: SavedCircuit) => {
    dispatch({
      type: "LOAD_STATE",
      state: { components: project.components, wires: project.wires },
    })
    onClose()
  }

  const deleteProject = (id: string) => {
    persist(projects.filter((project) => project.id !== id))
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/55 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-projects-title"
        className="flex max-h-[min(88dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <Folder className="size-4" />
            </div>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-primary">Local workspace / 02</p>
              <h2 id="my-projects-title" className="text-base font-bold tracking-tight">My Projects</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close My Projects" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-col gap-3 border-b border-border/80 bg-muted/15 p-4 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Project name</span>
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveCurrent()
              }}
              maxLength={80}
              placeholder="e.g. ESP32 motion alarm"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={saveCurrent}
            disabled={state.components.length === 0 || !projectName.trim()}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-mono text-[10px] font-bold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="size-3.5" /> Save current circuit
          </button>
        </div>

        {storageError && <p role="alert" className="px-4 pt-3 text-xs text-destructive">{storageError}</p>}

        <div className="sim-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-12 text-center">
              <Folder className="size-7 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-semibold">No saved projects yet</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Place parts on the canvas, wire your circuit, then save it here. Projects stay in this browser on this device.</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {projects.map((project) => (
                <article key={project.id} className="rounded-xl border border-border/80 bg-background/50 p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Folder className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{project.name}</h3>
                      <p className="mt-1 font-mono text-[9px] text-muted-foreground">{project.components.length} parts · {project.wires.length} wires</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(project.savedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => loadProject(project)} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/15">
                      Load project <ArrowUpRight className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteProject(project.id)} aria-label={`Delete ${project.name}`} title="Delete saved project" className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        <footer className="border-t border-border px-4 py-3 text-[10px] text-muted-foreground">
          Saved locally in this browser · Up to 50 circuits · Not synced to an account
        </footer>
      </section>
    </div>
  )
}
