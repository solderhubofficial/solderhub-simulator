"use client"

import { requestFitView } from "@/lib/simulator/fit-request"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  CircuitBoard,
  Trash2,
  Download,
  Upload,
  Braces,
  Undo2,
  Redo2,
  Expand,
  Shrink,
  Sun,
  Monitor,
  Moon,
  FolderOpen,
  X,
  Zap,
  Box,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { BoardChip } from "@/components/simulator/board-chip"
import { RunButton } from "@/components/simulator/run-button"
import { UserBadge } from "@/components/simulator/user-badge"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { useTheme } from "@/hooks/use-theme"
import { PROJECTS, type SimulatorProject } from "@/lib/simulator/firmware/projects"
import { applyProjectSource } from "@/lib/simulator/project-code"

interface SimulatorToolbarProps {
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onRequestProject: (project: SimulatorProject) => void
  onClearFirmware: () => void
  onImportError?: (message: string) => void
  viewMode: "2d" | "3d"
  onViewModeChange: (mode: "2d" | "3d") => void
  isLoadingProject: boolean
  error: string | null
  onClearError: () => void
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

export function SimulatorToolbar({
  isFullscreen,
  onToggleFullscreen,
  onRequestProject,
  onClearFirmware,
  onImportError,
  viewMode,
  onViewModeChange,
  isLoadingProject,
  error,
  onClearError,
}: SimulatorToolbarProps) {
  const { state, dispatch, undo, redo, canUndo, canRedo } = useSimulator()
  const { theme, preference, setPreference } = useTheme()
  const [themeOpen, setThemeOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const projectsMenuRef = useRef<HTMLDivElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const fileMenuRef = useRef<HTMLDivElement>(null)
  const [fileOpen, setFileOpen] = useState(false)

  useEffect(() => {
    if (!fileOpen) return
    const close = (e: MouseEvent) => { if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) setFileOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setFileOpen(false) }
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", esc)
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc) }
  }, [fileOpen])

  useEffect(() => {
    const openProjects = () => setProjectsOpen(true)
    window.addEventListener("simulator:open-projects", openProjects)
    return () => window.removeEventListener("simulator:open-projects", openProjects)
  }, [])

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

  const handleExport = () => {
    const payload = {
      format: "solderhub-circuit",
      version: 1,
      components: state.components,
      wires: state.wires,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "solderhub-circuit.json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handlePasteJson = () => {
    const source = window.prompt(
      "Paste a SolderHub circuit JSON object with components and wires. Importing replaces the current canvas."
    )
    if (source === null || !source.trim()) return

    try {
      const data = JSON.parse(source)
      if (!Array.isArray(data?.components) || !Array.isArray(data?.wires)) {
        throw new Error("shape")
      }
      dispatch({ type: "LOAD_STATE", state: { components: data.components, wires: data.wires } })
      applyProjectSource(data)
      requestFitView()
    } catch {
      onImportError?.("Invalid circuit JSON. Paste a SolderHub export containing components and wires.")
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-importing the same file later
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!Array.isArray(data?.components) || !Array.isArray(data?.wires)) {
        throw new Error("shape")
      }
      dispatch({ type: "LOAD_STATE", state: { components: data.components, wires: data.wires } }); applyProjectSource(data); requestFitView()
    } catch {
      onImportError?.("Couldn't read that file — expected a SolderHub circuit JSON export.")
    }
  }

  return (
    <>
    <header className="relative z-50 flex h-[60px] shrink-0 items-center gap-2 border-b border-border bg-card px-2 sm:gap-3 sm:px-4">
      {/* Brand */}
      <a
        href="https://solderhub.com/?utm_source=simulator&utm_medium=referral&utm_campaign=toolbar_logo"
        className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
        title="Back to SolderHub"
      >
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CircuitBoard className="size-[18px]" strokeWidth={2.2} />
        </div>
        <div className="hidden leading-tight sm:block">
          <p className="text-[15px] font-bold tracking-tight text-foreground">Solder<span className="text-primary">Hub</span></p>
          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Simulator</p>
        </div>
      </a>

      <Separator orientation="vertical" className="hidden h-5 sm:block" />

      <BoardChip />

      <div className="min-w-0 flex-1" />

      <div className="flex shrink-0 items-center gap-1.5">
        <Button size="icon-sm" variant="outline" onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd + Z)" aria-label="Undo" className="size-9 tap-pad rounded-lg"><Undo2 className="size-4" /></Button>
        <Button size="icon-sm" variant="outline" onClick={redo} disabled={!canRedo} title="Redo (Ctrl/Cmd + Shift + Z)" aria-label="Redo" className="size-9 tap-pad rounded-lg"><Redo2 className="size-4" /></Button>
      </div>


      {/* File menu: everything that is not the main loop lives here. */}
      <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
      <div ref={fileMenuRef} className="relative shrink-0">
        <Button size="sm" variant="outline" onClick={() => setFileOpen((v) => !v)} aria-haspopup="menu" aria-expanded={fileOpen} className="h-9 gap-1.5 rounded-lg px-3 text-xs font-semibold" title="File: export, import, flash, clear">
          <FolderOpen className="size-3.5" /><span className="hidden sm:inline">File</span><ChevronDown className="size-3.5 opacity-60" />
        </Button>
        {fileOpen && (
          <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 text-sm shadow-xl">
            {[
              { icon: Download, label: "Export circuit", run: handleExport },
              { icon: Upload, label: "Import file…", run: handleImportClick },
              { icon: Braces, label: "Paste JSON…", run: handlePasteJson },
            ].map(({ icon: Icon, label, run }) => (
              <button key={label} type="button" role="menuitem" onClick={() => { setFileOpen(false); run() }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted"><Icon className="size-4 text-muted-foreground" />{label}</button>
            ))}
            <Link href="/flasher" role="menuitem" onClick={() => setFileOpen(false)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted"><Zap className="size-4 text-muted-foreground" />Flash real ESP32</Link>
            <div className="my-1 h-px bg-border" />
            <button type="button" role="menuitem" onClick={() => { setFileOpen(false); dispatch({ type: "CLEAR_CANVAS" }); onClearFirmware() }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-destructive hover:bg-destructive/10"><Trash2 className="size-4" />Clear canvas</button>
          </div>
        )}
      </div>

      {/* 2D / isometric 3D view switch */}
      <div className="hidden shrink-0 items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5 sm:flex" role="group" aria-label="Circuit view mode">
        <Button size="sm" variant={viewMode === "2d" ? "secondary" : "ghost"} onClick={() => onViewModeChange("2d")} aria-pressed={viewMode === "2d"} title="Editable 2D circuit canvas" className="h-8 gap-1 px-2.5 text-xs"><CircuitBoard className="size-3.5" /><span>2D</span></Button>
        <Button size="sm" variant={viewMode === "3d" ? "secondary" : "ghost"} onClick={() => onViewModeChange("3d")} aria-pressed={viewMode === "3d"} title="Isometric 3D view" className="h-8 gap-1 px-2.5 text-xs"><Box className="size-3.5" /><span>3D</span></Button>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button size="icon-sm" variant="ghost" onClick={onToggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} className="hidden size-8 tap-pad sm:inline-flex">{isFullscreen ? <Shrink className="size-4" /> : <Expand className="size-4" />}</Button>
        <div className="relative">
          <Button size="icon-sm" variant="ghost" onClick={() => setThemeOpen((v) => !v)} aria-haspopup="menu" aria-expanded={themeOpen} aria-label="Colour mode" title={`Colour mode: ${preference}`} className="size-8 tap-pad">
            {preference === "system" ? <Monitor className="size-4" /> : theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </Button>
          {themeOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setThemeOpen(false)} aria-hidden="true" />
              <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-40 rounded-xl border border-border bg-popover p-1 text-sm shadow-xl">
                {([["system", "System", Monitor], ["light", "Light", Sun], ["dark", "Dark", Moon]] as const).map(([id, label, Icon]) => (
                  <button key={id} type="button" role="menuitemradio" aria-checked={preference === id} onClick={() => { setPreference(id); setThemeOpen(false) }} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-accent ${preference === id ? "text-primary" : ""}`}>
                    <Icon className="size-4" />{label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <a href="https://github.com/solderhubofficial/solderhub-simulator" target="_blank" rel="noopener noreferrer" title="View source on GitHub" aria-label="View source on GitHub" className="tap-pad hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"><GithubMark className="size-4" /></a>
        <UserBadge />
      </div>

      <RunButton isLoadingProject={isLoadingProject} error={error} onClearError={onClearError} />
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
