"use client"

import { useEffect, useRef, useState } from "react"
import {
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Cpu,
  Terminal,
  FileCode2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { createPlacedComponent } from "@/lib/simulator/utils/pins"
import type { SimulatorProject } from "@/lib/simulator/firmware/projects"
import { instantiateCircuit } from "@/lib/simulator/firmware/circuit"
import type { ActiveFirmware } from "@/components/simulator/firmware-runner"
import type { PlacedComponent } from "@/types/simulator"

export interface ProjectRequest {
  project: SimulatorProject
  token: number
}

interface ConsolePanelProps {
  request: ProjectRequest | null
  onFirmwareLoaded: (firmware: ActiveFirmware | null) => void
  onError: (message: string) => void
  onStreamingChange: (isStreaming: boolean) => void
  /** Called once a project's parts are on the canvas (used to fit the view). */
  onProjectPlaced?: (components: PlacedComponent[]) => void
  /**
   * Load projects without showing the build-log panel or its typing
   * animation. Used by the embedded view, where the canvas is the whole UI.
   */
  headless?: boolean
}

type ConsoleTab = "log" | "source"

export function ConsolePanel({
  request,
  onFirmwareLoaded,
  onError,
  onStreamingChange,
  onProjectPlaced,
  headless = false,
}: ConsolePanelProps) {
  const { dispatch } = useSimulator()
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<ConsoleTab>("log")
  const [visibleLines, setVisibleLines] = useState(0)
  const committedTokenRef = useRef<number | null>(null)

  useEffect(() => {
    if (!request) {
      onStreamingChange(false)
      return
    }

    const { project, token } = request
    setVisibleLines(0)
    setIsOpen(true)
    setActiveTab("log")
    onStreamingChange(true)

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    const commit = () => {
      if (cancelled || committedTokenRef.current === token) return
      committedTokenRef.current = token
      onStreamingChange(false)
      const def = getComponentDefinition(project.board)
      if (!def) {
        onError(`Couldn't find the "${project.board}" board for the "${project.name}" project.`)
        return
      }
      dispatch({ type: "CLEAR_CANVAS" })

      let placed: PlacedComponent[]
      let boardId: string
      if (project.circuit) {
        // Pre-wired project: place every part and wire, then run the
        // firmware on the circuit's board.
        try {
          const circuit = instantiateCircuit(project.circuit)
          for (const component of circuit.components) dispatch({ type: "ADD_COMPONENT", component })
          for (const wire of circuit.wires) dispatch({ type: "ADD_WIRE", wire })
          placed = circuit.components
          boardId = circuit.boardId
        } catch (err) {
          onError(err instanceof Error ? err.message : `Couldn't build the "${project.name}" circuit.`)
          return
        }
        // Adding parts selects the last one -- start with nothing selected.
        dispatch({ type: "SELECT_COMPONENT", id: null })
        dispatch({ type: "SELECT_WIRE", id: null })
      } else {
        const board = createPlacedComponent(def, 160, 140)
        dispatch({ type: "ADD_COMPONENT", component: board })
        placed = [board]
        boardId = board.id
      }

      dispatch({ type: "SET_RUNNING", isRunning: true })
      onFirmwareLoaded({ componentId: boardId, hex: project.hex })
      onProjectPlaced?.(placed)
    }

    const revealNext = (index: number) => {
      if (cancelled) return
      if (index >= project.buildLog.length) {
        timeoutId = setTimeout(commit, 400)
        return
      }
      setVisibleLines(index + 1)
      const line = project.buildLog[index]
      const delay = line.startsWith("avr-") ? 420 : 220
      timeoutId = setTimeout(() => revealNext(index + 1), delay)
    }

    // Headless (embedded) loads skip the compile-log animation entirely.
    timeoutId = setTimeout(headless ? commit : () => revealNext(0), headless ? 0 : 200)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.token])

  if (!request || headless) return null
  const { project } = request
  const isStreaming = visibleLines < project.buildLog.length

  const openInNewTab = () => {
    const contents = `// ${project.name}\n${project.source}\n\n--- build log ---\n${project.buildLog.join("\n")}\n`
    const blob = new Blob([contents], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank", "noopener,noreferrer")
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-30 flex justify-end">
      <div className="pointer-events-auto flex h-full w-[min(24rem,92vw)] flex-col overflow-hidden border-l border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-4 duration-200">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            {isStreaming ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0 text-status-running" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {project.name}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {isStreaming ? "Compiling & uploading…" : "Firmware ready — simulation running"}
              </p>
            </div>
          </button>

          <Badge variant="outline" className="hidden shrink-0 gap-1 normal-case tracking-normal sm:inline-flex">
            <Cpu className="size-3" />
            {project.board}
          </Badge>

          <button
            type="button"
            title="Open source + build log"
            onClick={openInNewTab}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground tap-pad"
          >
            <ExternalLink className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground tap-pad"
          >
            <ChevronDown className={cn("size-4 transition-transform", !isOpen && "-rotate-90")} />
          </button>
        </div>

        {isOpen && (
          <>
            {/* Tab bar */}
            <div className="flex shrink-0 border-b border-border bg-muted/30">
              <TabButton
                active={activeTab === "log"}
                onClick={() => setActiveTab("log")}
                icon={Terminal}
                label="Build Log"
              />
              <TabButton
                active={activeTab === "source"}
                onClick={() => setActiveTab("source")}
                icon={FileCode2}
                label="Source"
              />
            </div>

            {/* Content */}
            {activeTab === "log" ? (
              <div className="min-h-0 flex-1 overflow-y-auto sim-scrollbar bg-[oklch(0.11_0.02_260)] px-4 py-3 font-mono text-[11px] leading-relaxed">
                {project.buildLog.slice(0, visibleLines).map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "animate-in fade-in slide-in-from-left-1 duration-150",
                      line.startsWith("avr-") ? "text-amber-400/90" : "text-neutral-300",
                    )}
                  >
                    <span className="select-none text-neutral-600">{"> "}</span>
                    {line}
                  </div>
                ))}
                {isStreaming && (
                  <span className="inline-block h-3.5 w-2 translate-y-0.5 animate-pulse bg-neutral-500" />
                )}
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto sim-scrollbar border-t-0 bg-muted/20 px-4 py-3">
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {project.source}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}
