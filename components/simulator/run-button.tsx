"use client"

import { AlertTriangle, Loader2, Play, Square } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { hasBoard } from "@/lib/simulator/board-label"
import { cn } from "@/lib/utils"

interface RunButtonProps {
  isLoadingProject: boolean
  error: string | null
  onClearError: () => void
}

/** The one Run / Stop control of the workbench. */
export function RunButton({ isLoadingProject, error, onClearError }: RunButtonProps) {
  const { state, dispatch } = useSimulator()
  const running = state.isRunning
  const failed = Boolean(error)
  const noBoard = !running && !hasBoard(state.components)

  const toggle = () => {
    if (failed) { onClearError(); return }
    if (noBoard) return
    dispatch({ type: "SET_RUNNING", isRunning: !running })
  }

  const Icon = isLoadingProject ? Loader2 : failed ? AlertTriangle : running ? Square : Play
  const label = isLoadingProject ? "Loading…" : failed ? "Dismiss error" : running ? "Stop" : "Run"

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isLoadingProject || (noBoard && !failed)}
      data-testid="run-toggle"
      aria-label={label}
      title={noBoard && !failed ? "Add a board to run the simulation" : failed ? (error ?? "Dismiss error") : running ? "Stop simulation (Space)" : "Run simulation (Space)"}
      className={cn(
        "inline-flex h-9 min-w-[5.5rem] shrink-0 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        running
          ? "border-status-error/50 bg-status-error/10 text-status-error hover:bg-status-error/20"
          : failed
            ? "border-status-error/50 bg-status-error/10 text-status-error hover:bg-status-error/20"
            : "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      <Icon className={cn("size-4", isLoadingProject && "animate-spin", !running && !failed && !isLoadingProject && "fill-current")} />
      <span>{label}</span>
    </button>
  )
}
