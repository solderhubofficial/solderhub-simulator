"use client"

import {
  Play,
  Square,
  Loader2,
  AlertTriangle,
  Cpu,
  Cable,
  Layers,
  ZoomIn,
} from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface StatusBarProps {
  isLoadingProject: boolean
  error: string | null
  onClearError: () => void
  onToggleShortcuts: () => void
}

export function StatusBar({
  isLoadingProject,
  error,
  onClearError,
  onToggleShortcuts,
}: StatusBarProps) {
  const { state, dispatch } = useSimulator()

  const status: "running" | "error" | "idle" = error
    ? "error"
    : state.isRunning
      ? "running"
      : "idle"

  const handleRunToggle = () => {
    if (status === "error") {
      onClearError()
      return
    }
    dispatch({ type: "SET_RUNNING", isRunning: !state.isRunning })
  }

  const RunIcon = isLoadingProject ? Loader2 : status === "running" ? Square : status === "error" ? AlertTriangle : Play

  return (
    <footer className="flex h-9 shrink-0 items-center gap-2 border-t border-border bg-card/95 px-2 text-xs sm:px-3">
      {/* Run / Stop */}
      <button
        type="button"
        onClick={handleRunToggle}
        disabled={isLoadingProject}
        title={
          status === "error"
            ? error ?? "Error — click to dismiss"
            : status === "running"
              ? "Stop simulation (Space)"
              : "Run simulation (Space)"
        }
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-md px-2.5 font-medium transition-all",
          status === "running" &&
            "bg-status-running/15 text-status-running hover:bg-status-running/25",
          status === "idle" &&
            "bg-primary/10 text-primary hover:bg-primary/20",
          status === "error" &&
            "bg-status-error/15 text-status-error hover:bg-status-error/25",
          isLoadingProject && "cursor-wait opacity-70",
        )}
      >
        <RunIcon className={cn("size-3.5", isLoadingProject && "animate-spin")} />
        <span className="hidden sm:inline">
          {isLoadingProject
            ? "Loading…"
            : status === "running"
              ? "Running"
              : status === "error"
                ? "Error"
                : "Run"}
        </span>
      </button>

      <div className="hidden h-4 w-px bg-border sm:block" />

      {/* Simulation status badge */}
      <Badge
        variant={
          status === "running" ? "success" : status === "error" ? "destructive" : "warning"
        }
        className="hidden sm:inline-flex"
      >
        <span
          className={cn(
            "mr-1.5 size-1.5 rounded-full",
            status === "running" && "bg-status-running animate-pulse",
            status === "idle" && "bg-status-idle",
            status === "error" && "bg-status-error",
          )}
        />
        {status === "running" ? "Simulating" : status === "error" ? "Failed" : "Stopped"}
      </Badge>

      {error && (
        <p className="min-w-0 flex-1 truncate text-status-error" title={error}>
          {error}
        </p>
      )}

      {/* Stats — pushed right */}
      <div className="ml-auto flex items-center gap-3 text-muted-foreground">
        <span className="hidden items-center gap-1 sm:flex" title="Components on canvas">
          <Layers className="size-3" />
          <span className="font-mono tabular-nums">{state.components.length}</span>
        </span>
        <span className="hidden items-center gap-1 sm:flex" title="Wires">
          <Cable className="size-3" />
          <span className="font-mono tabular-nums">{state.wires.length}</span>
        </span>
        <span className="hidden items-center gap-1 md:flex" title="Zoom level">
          <ZoomIn className="size-3" />
          <span className="font-mono tabular-nums">{Math.round(state.viewport.zoom * 100)}%</span>
        </span>
        <span className="hidden items-center gap-1 lg:flex" title="Board type">
          <Cpu className="size-3" />
          <span>AVR</span>
        </span>
        <button
          type="button"
          onClick={onToggleShortcuts}
          className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground tap-pad"
          title="Keyboard shortcuts"
        >
          ?
        </button>
      </div>
    </footer>
  )
}
