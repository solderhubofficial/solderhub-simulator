"use client"

import { useEffect, useRef, useState } from "react"
import {
  CircuitBoard,
  Trash2,
  Save,
  Expand,
  Shrink,
  Sun,
  Moon,
  PanelLeft,
  FolderOpen,
  ChevronDown,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { UserBadge } from "@/components/simulator/user-badge"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { useTheme } from "@/hooks/use-theme"
import { PROJECTS, type SimulatorProject } from "@/lib/simulator/firmware/projects"
import { cn } from "@/lib/utils"

interface SimulatorToolbarProps {
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onTogglePalette: () => void
  onRequestProject: (project: SimulatorProject) => void
  isLoadingProject: boolean
  onClearFirmware: () => void
  paletteOpen: boolean
}

export function SimulatorToolbar({
  isFullscreen,
  onToggleFullscreen,
  onTogglePalette,
  onRequestProject,
  isLoadingProject,
  onClearFirmware,
  paletteOpen,
}: SimulatorToolbarProps) {
  const { state, dispatch } = useSimulator()
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
    const payload = { components: state.components, wires: state.wires }
    const json = JSON.stringify(payload, null, 2)
    const filename = "solderhub-circuit.json"

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json)
      }
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
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-card/95 px-2 backdrop-blur-sm sm:gap-2 sm:px-3">
      {/* Mobile palette toggle */}
      <Button
        size="icon-sm"
        variant={paletteOpen ? "secondary" : "ghost"}
        onClick={onTogglePalette}
        title="Component library"
        className="lg:hidden"
      >
        <PanelLeft className="size-4" />
      </Button>

      {/* Brand */}
      <a
        href="https://solderhub.com"
        className="flex shrink-0 items-center gap-2.5 pr-2 transition-opacity hover:opacity-80 sm:pr-3"
        title="Back to SolderHub"
      >
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
          <CircuitBoard className="size-4" />
        </div>
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-semibold tracking-tight text-foreground">SolderHub</p>
          <p className="text-[10px] font-medium text-muted-foreground">Circuit Simulator</p>
        </div>
      </a>

      <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

      {/* File actions */}
      <div className="flex shrink-0 items-center gap-1">
        <div className="relative" ref={projectsMenuRef}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setProjectsOpen((v) => !v)}
            disabled={isLoadingProject}
            className="h-8 gap-1.5 border-border/80 bg-background/50"
            title="Load a demo project"
          >
            <FolderOpen className="size-3.5" />
            <span className="hidden sm:inline">Projects</span>
            <ChevronDown className={cn("size-3 opacity-60 transition-transform", projectsOpen && "rotate-180")} />
          </Button>
          {projectsOpen && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="border-b border-border px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Demo projects
                </p>
              </div>
              {PROJECTS.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setProjectsOpen(false)
                    onRequestProject(project)
                  }}
                  className="flex w-full flex-col items-start gap-0.5 border-b border-border/50 px-3 py-2.5 text-left last:border-0 hover:bg-muted/60"
                >
                  <span className="text-sm font-medium text-foreground">{project.name}</span>
                  <span className="text-[11px] leading-snug text-muted-foreground">{project.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          className="h-8 gap-1.5 border-border/80 bg-background/50"
          title="Save circuit to clipboard"
        >
          <Save className="size-3.5" />
          <span className="hidden sm:inline">Save</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            dispatch({ type: "CLEAR_CANVAS" })
            onClearFirmware()
          }}
          className="h-8 gap-1.5 border-border/80 bg-background/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title="Clear canvas"
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View controls */}
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="size-8"
        >
          {isFullscreen ? <Shrink className="size-4" /> : <Expand className="size-4" />}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={toggleTheme}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          className="size-8"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <a
          href="https://github.com/solderhubofficial/solderhub-simulator"
          target="_blank"
          rel="noopener noreferrer"
          title="View on GitHub"
          className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
        >
          <ExternalLink className="size-4" />
        </a>
        <UserBadge />
      </div>
    </header>
  )
}
