"use client"

import { requestFitView } from "@/lib/simulator/fit-request"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  CircuitBoard,
  Trash2,
  Download,
  Upload,
  Undo2,
  Redo2,
  Expand,
  Shrink,
  Sun,
  Moon,
  FolderOpen,
  X,
  Zap,
  ShieldCheck,
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
  onRequestProject: (project: SimulatorProject) => void
  onClearFirmware: () => void
  onImportError?: (message: string) => void
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
}: SimulatorToolbarProps) {
  const { state, dispatch, undo, redo, canUndo, canRedo } = useSimulator()
  const { theme, toggleTheme } = useTheme()
  const [projectsOpen, setProjectsOpen] = useState(false)
  const projectsMenuRef = useRef<HTMLDivElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

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
      dispatch({ type: "LOAD_STATE", state: { components: data.components, wires: data.wires } }); requestFitView()
    } catch {
      onImportError?.("Couldn't read that file — expected a SolderHub circuit JSON export.")
    }
  }

  return (
    <>
    <header className="relative z-50 flex h-[60px] shrink-0 items-center gap-1 border-b border-border/80 bg-background/95 px-2 shadow-[0_8px_28px_rgba(15,23,42,0.045)] backdrop-blur-2xl sm:gap-2 sm:px-4"><div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      {/* Brand */}
      <a
        href="https://solderhub.com/?utm_source=simulator&utm_medium=referral&utm_campaign=toolbar_logo"
        className="flex shrink-0 items-center gap-2.5 pr-1 transition-opacity hover:opacity-90 sm:pr-3"
        title="Back to SolderHub"
      >
        <div className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl border border-blue-500/25 bg-gradient-to-br from-blue-500/15 via-background to-orange-500/15 text-blue-600 shadow-sm dark:text-blue-400">
          <CircuitBoard className="size-[18px]" strokeWidth={2.1} />
          <span className="absolute bottom-1 right-1 size-1.5 rounded-full bg-orange-500 ring-2 ring-background" />
        </div>
        <div className="hidden leading-tight sm:block">
          <p className="text-[15px] font-black tracking-[-0.055em]"><span className="text-blue-600 dark:text-blue-400">Solder</span><span className="text-orange-500">Hub</span></p>
          <p className="mt-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Electronics Workbench</p>
        </div>
      </a>

      <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

      {/* Undo/redo + file actions share one scrollable strip on narrow
          screens. The workbench rail owns panel navigation, so this header
          stays focused on circuit actions and view controls. */}
      <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-20px),transparent)] sm:[mask-image:none]">
        {/* Undo / redo */}
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl/Cmd + Z)"
            aria-label="Undo"
            className="size-8 tap-pad"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl/Cmd + Shift + Z)"
            aria-label="Redo"
            className="size-8 tap-pad"
          >
            <Redo2 className="size-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

        {/* File actions */}
        <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          className="h-9 gap-1.5 rounded-xl border-border/70 bg-card/80 px-3 text-xs font-semibold shadow-sm shadow-black/[0.02] transition-all hover:-translate-y-px hover:border-blue-500/40 hover:bg-blue-500/[0.06] hover:text-blue-600 dark:hover:text-blue-400"
          title="Download circuit JSON"
        >
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleImportClick}
          className="h-9 gap-1.5 border-border/80 bg-background/50 shadow-none"
          title="Import a circuit JSON file"
        >
          <Upload className="size-3.5" />
          <span className="hidden sm:inline">Import</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            dispatch({ type: "CLEAR_CANVAS" })
            onClearFirmware()
          }}
          className="h-9 gap-1.5 rounded-xl border-destructive/20 bg-destructive/[0.04] px-3 text-xs font-semibold text-destructive shadow-sm shadow-black/[0.02] transition-all hover:-translate-y-px hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          title="Clear canvas"
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 border-border/80 bg-background/50 shadow-none"
          title="Flash real ESP32 hardware over USB"
        >
          <Link href="/flasher">
            <Zap className="size-3.5" />
            <span className="hidden sm:inline">Flash</span>
          </Link>
        </Button>
        </div>
      </div>

      {/* View controls */}
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="size-8 tap-pad"
        >
          {isFullscreen ? <Shrink className="size-4" /> : <Expand className="size-4" />}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={toggleTheme}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          className="size-8 tap-pad"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <a
          href="https://github.com/solderhubofficial/solderhub-simulator"
          target="_blank"
          rel="noopener noreferrer"
          title="View source on GitHub" aria-label="View source on GitHub"
          className="tap-pad hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
        >
          <GithubMark className="size-4" />
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
