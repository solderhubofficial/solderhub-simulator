"use client"

import {
  CircuitBoard,
  Play,
  Square,
  Trash2,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserBadge } from "@/components/simulator/user-badge"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { useCanvasViewport } from "@/hooks/simulator/use-canvas-viewport"
import { cn } from "@/lib/utils"

export function SimulatorToolbar() {
  const { state, dispatch } = useSimulator()
  const { zoomIn, zoomOut, resetView } = useCanvasViewport()

  return (
    <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border bg-card px-4 shadow-sm">
      <a
        href="https://solderhub.com"
        className="mr-3 flex items-center gap-2 pr-3 border-r border-border transition-opacity hover:opacity-80"
        title="Back to SolderHub"
      >
        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CircuitBoard className="size-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">Circuit Simulator</p>
          <p className="text-[10px] text-muted-foreground">SolderHub</p>
        </div>
      </a>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={state.isRunning ? "secondary" : "default"}
          onClick={() => dispatch({ type: "SET_RUNNING", isRunning: true })}
          disabled={state.isRunning}
          className="gap-1.5"
        >
          <Play className="size-3.5" />
          Run
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: "SET_RUNNING", isRunning: false })}
          disabled={!state.isRunning}
          className="gap-1.5"
        >
          <Square className="size-3.5" />
          Stop
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: "CLEAR_CANVAS" })}
          className="gap-1.5"
        >
          <Trash2 className="size-3.5" />
          Clear
        </Button>
        <Button size="sm" variant="outline" disabled className="gap-1.5 opacity-50">
          <Save className="size-3.5" />
          Save
        </Button>
      </div>

      <div className="mx-2 h-5 w-px bg-border" />

      <div className="flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" onClick={zoomIn} title="Zoom In">
          <ZoomIn className="size-4" />
        </Button>
        <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
          {Math.round(state.viewport.zoom * 100)}%
        </span>
        <Button size="icon-sm" variant="ghost" onClick={zoomOut} title="Zoom Out">
          <ZoomOut className="size-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={resetView} title="Reset View">
          <Maximize2 className="size-4" />
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <UserBadge />
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
            state.isRunning
              ? "bg-green-500/15 text-green-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              state.isRunning ? "bg-green-400 animate-pulse" : "bg-muted-foreground"
            )}
          />
          {state.isRunning ? "Simulating" : "Stopped"}
        </span>
      </div>
    </div>
  )
}
