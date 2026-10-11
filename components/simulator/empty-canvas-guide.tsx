"use client"

import { Cable, FolderOpen, MousePointerClick, Play, X } from "lucide-react"
import { useState } from "react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { PROJECTS, type SimulatorProject } from "@/lib/simulator/firmware/projects"

interface EmptyCanvasGuideProps {
  onRequestProject: (project: SimulatorProject) => void
  isLoadingProject: boolean
}

const STEPS = [
  { icon: MousePointerClick, title: "Add parts", body: "Drag a board and components from the left panel onto the canvas." },
  { icon: Cable, title: "Wire them up", body: "Click a pin to start a wire, then click another pin to finish it." },
  { icon: Play, title: "Run it", body: "Press Space (or Run) to start the simulation." },
] as const

/**
 * First-load guidance for an empty canvas. Can be dismissed with the close
 * button; adding a component or loading a project also hides it.
 *
 * The wrapper ignores pointer events so panning and zooming the canvas behind
 * it keep working; only the card itself is interactive.
 */
export function EmptyCanvasGuide({ onRequestProject, isLoadingProject }: EmptyCanvasGuideProps) {
  const { state } = useSimulator()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || state.components.length > 0 || isLoadingProject) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
      <section
        aria-label="Getting started"
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-border/70 bg-card/95 p-5 shadow-xl backdrop-blur"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">Build your first circuit</h2>
            <p className="mt-1 text-xs text-muted-foreground">Three steps, or start from a ready-made project.</p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Close getting started guide"
            title="Close"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <ol className="mt-4 space-y-3">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {index + 1}. {title}
                </span>
                <span className="block text-[11px] leading-relaxed text-muted-foreground">{body}</span>
              </span>
            </li>
          ))}
        </ol>

        {PROJECTS.length > 0 && (
          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Or start from a project
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {PROJECTS.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onRequestProject(project)}
                  className="group flex items-center gap-3 rounded-xl border border-border/70 bg-background/55 p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/[0.06] focus-visible:border-primary"
                >
                  <FolderOpen className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{project.name}</span>
                    <span className="block text-[11px] leading-relaxed text-muted-foreground">{project.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
