"use client"

import { Play, Square, Loader2, AlertTriangle } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { cn } from "@/lib/utils"

interface SimulationControlsProps {
  isLoadingProject: boolean
  error: string | null
  onClearError: () => void
}

/**
 * Replaces the old toolbar Run/Stop buttons + "Simulating"/"Stopped" text
 * pill with a single floating control on the canvas itself: green while a
 * simulation is running, orange while idle or a project is loading, red on
 * error. Clicking toggles run/stop; clicking while in an error state
 * dismisses the error instead.
 */
export function SimulationControls({ isLoadingProject, error, onClearError }: SimulationControlsProps) {
  const { state, dispatch } = useSimulator()

  const status: "running" | "error" | "idle" = error ? "error" : state.isRunning ? "running" : "idle"

  const handleClick = () => {
    if (status === "error") {
      onClearError()
      return
    }
    dispatch({ type: "SET_RUNNING", isRunning: !state.isRunning })
  }

  const label = isLoadingProject
    ? "Loading"
    : status === "running"
      ? "Simulating"
      : status === "error"
        ? "Error"
        : "Idle"

  const Icon = isLoadingProject ? Loader2 : status === "running" ? Square : status === "error" ? AlertTriangle : Play

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoadingProject}
      title={
        status === "error"
          ? error ?? "Something went wrong loading that project — click to dismiss"
          : status === "running"
            ? "Stop simulation"
            : "Run simulation"
      }
      className={cn(
        "absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-sm transition-colors",
        status === "running" && "border-green-500/30 bg-green-500/15 text-green-400 hover:bg-green-500/20",
        status === "error" && "border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/20",
        status === "idle" && "border-amber-500/30 bg-amber-500/15 text-amber-400 hover:bg-amber-500/20",
        isLoadingProject && "cursor-wait opacity-90"
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          status === "running" && "bg-green-400",
          status === "error" && "bg-red-400",
          status === "idle" && "bg-amber-400",
          (status === "running" || isLoadingProject) && "animate-pulse"
        )}
      />
      <Icon className={cn("size-4", isLoadingProject && "animate-spin")} />
      <span>{label}</span>
    </button>
  )
}
