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
  Expand,
  Shrink,
  Sun,
  Moon,
  PanelLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserBadge } from "@/components/simulator/user-badge"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { useCanvasViewport } from "@/hooks/simulator/use-canvas-viewport"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

interface SimulatorToolbarProps {
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onTogglePalette: () => void
}

export function SimulatorToolbar({
  isFullscreen,
  onToggleFullscreen,
  onTogglePalette,
}: SimulatorToolbarProps) {
  const { state, dispatch } = useSimulator()
  const { zoomIn, zoomOut, resetView } = useCanvasViewport()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex h-14 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-card px-2 shadow-sm sm:px-4">
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onTogglePalette}
        title="Components"
        className="mr-1 lg:hidden"
      >
        <PanelLeft className="size-4" />
      </Button>

      <a
        href="https://solderhub.com"
        className="mr-3 flex shrink-0 items-center gap-2 pr-3 border-r border-border transition-opacity hover:opacity-80"
        title="Back to SolderHub"
      >
        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CircuitBoard className="size-4" />
        </div>
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-semibold text-foreground">Circuit Simulator</p>
          <p className="text-[10px] text-muted-foreground">SolderHub</p>
        </div>
      </a>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant={state.isRunning ? "secondary" : "default"}
          onClick={() => dispatch({ type: "SET_RUNNING", isRunning: true })}
          disabled={state.isRunning}
          className="gap-1.5"
        >
          <Play className="size-3.5" />
          <span className="hidden sm:inline">Run</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: "SET_RUNNING", isRunning: false })}
          disabled={!state.isRunning}
          className="gap-1.5"
        >
          <Square className="size-3.5" />
          <span className="hidden sm:inline">Stop</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: "CLEAR_CANVAS" })}
          className="gap-1.5"
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
        <Button size="sm" variant="outline" disabled className="gap-1.5 opacity-50">
          <Save className="size-3.5" />
          <span className="hidden sm:inline">Save</span>
        </Button>
      </div>

      <div className="mx-2 h-5 w-px shrink-0 bg-border" />

      <div className="flex shrink-0 items-center gap-1">
        <Button size="icon-sm" variant="ghost" onClick={zoomIn} title="Zoom In">
          <ZoomIn className="size-4" />
        </Button>
        <span className="hidden min-w-[3rem] text-center text-xs text-muted-foreground sm:inline">
          {Math.round(state.viewport.zoom * 100)}%
        </span>
        <Button size="icon-sm" variant="ghost" onClick={zoomOut} title="Zoom Out">
          <ZoomOut className="size-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={resetView} title="Reset View">
          <Maximize2 className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
        >
          {isFullscreen ? <Shrink className="size-4" /> : <Expand className="size-4" />}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3 pl-2">
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
          <span className="hidden sm:inline">{state.isRunning ? "Simulating" : "Stopped"}</span>
        </span>
      </div>
    </div>
  )
}
