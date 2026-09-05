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
  PanelRight,
  FolderOpen,
  X,
  ExternalLink,
  Code2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { UserBadge } from "@/components/simulator/user-badge"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { useTheme } from "@/hooks/use-theme"
import { PROJECTS, type SimulatorProject } from "@/lib/simulator/firmware/projects"

interface SimulatorToolbarProps {
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onTogglePalette: () => void
  onToggleProperties: () => void
  onRequestProject: (project: SimulatorProject) => void
  isLoadingProject: boolean
  onClearFirmware: () => void
  paletteOpen: boolean
  propertiesOpen: boolean
  onToggleCodeEditor: () => void
  isCodeEditorOpen: boolean
}

export function SimulatorToolbar({
  isFullscreen,
  onToggleFullscreen,
  onTogglePalette,
  onToggleProperties,
  onRequestProject,
  isLoadingProject,
  onClearFirmware,
  paletteOpen,
  propertiesOpen,
  onToggleCodeEditor,
  isCodeEditorOpen,
}: SimulatorToolbarProps) {
  const { state, dispatch } = useSimulator()
  const { theme, toggleTheme } = useTheme()
  const [projectsOpen, setProjectsOpen] = useState(false)
  const projectsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!projectsOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProjectsOpen(false)
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (projectsMenuRef.current && !projectsMenuRef.current.contains(e.target as Node)) {
        setProjectsOpen(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleClickOutside)
    }
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
    <>
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border/80 bg-card/90 px-2 shadow-[0_1px_0_oklch(1_0_0_/_0.5)] backdrop-blur-xl sm:gap-2 sm:px-4">
      {/* Mobile palette toggle */}
      <Button
        size="icon-sm"
        variant={paletteOpen ? "secondary" : "ghost"}
        onClick={onTogglePalette}
        title={paletteOpen ? "Hide component library" : "Show component library"}
        aria-label={paletteOpen ? "Hide component library" : "Show component library"}
        className="size-8"
      >
        <PanelLeft className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant={propertiesOpen ? "secondary" : "ghost"}
        onClick={onToggleProperties}
        title={propertiesOpen ? "Hide board info" : "Show board info"}
        aria-label={propertiesOpen ? "Hide board info" : "Show board info"}
        className="size-8 lg:order-last"
      >
        <PanelRight className="size-4" />
      </Button>

      {/* Brand */}
      <a
        href="https://solderhub.com"
        className="flex shrink-0 items-center gap-2.5 pr-1 transition-opacity hover:opacity-80 sm:pr-3"
        title="Back to SolderHub"
      >
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
          <CircuitBoard className="size-4" />
        </div>
        <div className="hidden leading-tight sm:block">
          <p className="text-[13px] font-bold tracking-tight text-foreground">SolderHub</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Workbench</p>
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
            className="h-9 gap-1.5 border-border/80 bg-background/50 shadow-none"
            title="Load a demo project"
          >
            <FolderOpen className="size-3.5" />
            <span className="hidden sm:inline">Projects</span>
            <span className="hidden text-[10px] text-muted-foreground sm:inline">Open</span>
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          className="h-9 gap-1.5 border-border/80 bg-background/50 shadow-none"
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
          className="h-9 gap-1.5 border-border/80 bg-background/50 text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive"
          title="Clear canvas"
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
        <Button
          size="sm"
          variant={isCodeEditorOpen ? "secondary" : "outline"}
          onClick={onToggleCodeEditor}
          className="h-9 gap-1.5 border-border/80 bg-background/50 shadow-none"
          title="Write and run your own sketch"
        >
          <Code2 className="size-3.5" />
          <span className="hidden sm:inline">Code</span>
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

      {projectsOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-foreground/25 px-3 pb-8 pt-[clamp(5rem,15vh,9rem)] backdrop-blur-sm animate-in fade-in duration-150 sm:px-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setProjectsOpen(false)
          }}
          role="presentation"
        >
          <section
            ref={projectsMenuRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="projects-dialog-title"
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-popover shadow-2xl shadow-black/20 animate-in zoom-in-95 slide-in-from-top-2 duration-200"
          >
            <div className="flex items-start justify-between border-b border-border/80 bg-muted/20 px-4 py-4 sm:px-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Workbench library</p>
                <h2 id="projects-dialog-title" className="mt-1 text-lg font-bold tracking-tight text-foreground">
                  Start from a project
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">Load a ready-to-run circuit onto your canvas.</p>
              </div>
              <button
                type="button"
                onClick={() => setProjectsOpen(false)}
                aria-label="Close projects"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4">
              {PROJECTS.map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setProjectsOpen(false)
                    onRequestProject(project)
                  }}
                  className="group flex min-h-28 flex-col items-start justify-between rounded-xl border border-border/70 bg-background/55 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/[0.06] hover:shadow-lg hover:shadow-primary/5 focus-visible:border-primary"
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 font-mono text-[10px] font-bold text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <FolderOpen className="size-3.5 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{project.name}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{project.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
