"use client"

import { AlertTriangle, ExternalLink, Pause, Play } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import type { SimulatorProject } from "@/lib/simulator/firmware/projects"

/**
 * The only chrome shown when the simulator is embedded in another page
 * (`?embed=1`): a small status/controls pill and an "open full simulator"
 * link. Everything else -- toolbar, palettes, panels -- is hidden so the
 * circuit gets the whole frame.
 */
export function EmbedChrome({
  project,
  error,
  onClearError,
}: {
  project: SimulatorProject | null
  error: string | null
  onClearError: () => void
}) {
  const { state, dispatch } = useSimulator()

  // Same page, minus `embed`, so the full simulator opens on the same project.
  const fullSimulatorHref = (() => {
    if (typeof window === "undefined") return "/"
    const url = new URL(window.location.href)
    url.searchParams.delete("embed")
    return url.toString()
  })()

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-end justify-between gap-2 p-2.5">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/80 bg-card/95 py-1 pl-1 pr-3 shadow-lg backdrop-blur-xl">
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_RUNNING", isRunning: !state.isRunning })}
            disabled={!project}
            aria-label={state.isRunning ? "Pause simulation" : "Run simulation"}
            className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {state.isRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5 translate-x-px" />}
          </button>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-medium text-foreground">
              {project ? project.name : "Loading…"}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {state.isRunning ? "Running real firmware" : "Paused"}
            </p>
          </div>
        </div>

        <a
          href={fullSimulatorHref}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-xl transition-colors hover:bg-muted"
        >
          Open in simulator <ExternalLink className="size-3" />
        </a>
      </div>

      {error && (
        <div className="absolute inset-x-2.5 top-2.5 z-40 flex items-start gap-2 rounded-xl border border-destructive/40 bg-card/95 p-2.5 text-xs text-foreground shadow-lg backdrop-blur-xl">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          <p className="min-w-0 flex-1">{error}</p>
          <button type="button" onClick={onClearError} className="text-muted-foreground hover:text-foreground">
            Dismiss
          </button>
        </div>
      )}
    </>
  )
}
