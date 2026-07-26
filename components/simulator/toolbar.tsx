"use client"

import { useEffect, useRef, useState } from "react"
import {
  CircuitBoard,
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
  FolderOpen,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserBadge } from "@/components/simulator/user-badge"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { useCanvasViewport } from "@/hooks/simulator/use-canvas-viewport"
import { useTheme } from "@/hooks/use-theme"
import { PROJECTS, type SimulatorProject } from "@/lib/simulator/firmware/projects"

interface SimulatorToolbarProps {
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onTogglePalette: () => void
  onRequestProject: (project: SimulatorProject) => void
  isLoadingProject: boolean
  onClearFirmware: () => void
}

export function SimulatorToolbar({
  isFullscreen,
  onToggleFullscreen,
  onTogglePalette,
  onRequestProject,
  isLoadingProject,
  onClearFirmware,
}: SimulatorToolbarProps) {
  const { state, dispatch } = useSimulator()
  const { zoomIn, zoomOut, resetView } = useCanvasViewport()
  const { theme, toggleTheme } = useTheme()
  const [projectsOpen, setProjectsOpen] = useState(false)
  const projectsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!projectsOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (projectsMenuRef.current && !projectsMenuRef.current.contains(e.target as Node)) {
        setProjectsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [projectsOpen])

  const handleSave = async () => {
    const payload = {
      components: state.components,
      wires: state.wires,
    }
    const json = JSON.stringify(payload, null, 2)
    const filename = "solderhub-simulator-state.json"

    const writeClipboard = async () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(json)
      }
    }

    try {
      await writeClipboard()
    } catch {
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

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
        <div className="relative" ref={projectsMenuRef}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setProjectsOpen((v) => !v)}
            disabled={isLoadingProject}
            className="gap-1.5"
            title="Load a pre-built project"
          >
            <FolderOpen className="size-3.5" />
            <span className="hidden sm:inline">Projects</span>
            <ChevronDown className="size-3 opacity-60" />
          </Button>
          {projectsOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-md border border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
              {PROJECTS.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setProjectsOpen(false)
                    onRequestProject(project)
                  }}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted"
                >
                  <span className="text-sm font-medium text-foreground">{project.name}</span>
                  <span className="text-[11px] text-muted-foreground">{project.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            dispatch({ type: "CLEAR_CANVAS" })
            onClearFirmware()
          }}
          className="gap-1.5"
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
        <Button size="sm" variant="outline" onClick={handleSave} className="gap-1.5">
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

      <div className="ml-auto flex shrink-0 items-center pl-2">
        <UserBadge />
      </div>
    </div>
  )
}
