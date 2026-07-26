"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle2, Loader2, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { createPlacedComponent } from "@/lib/simulator/utils/pins"
import type { SimulatorProject } from "@/lib/simulator/firmware/projects"
import type { ActiveFirmware } from "@/components/simulator/firmware-runner"

export interface ProjectRequest {
  project: SimulatorProject
  /** Bumped on every request, even for the same project, so re-clicking replays the stream. */
  token: number
}

interface ConsolePanelProps {
  request: ProjectRequest | null
  onFirmwareLoaded: (firmware: ActiveFirmware | null) => void
  onError: (message: string) => void
  onStreamingChange: (isStreaming: boolean) => void
}

/**
 * Docked at the bottom of the canvas instead of a full-screen modal, and —
 * unlike the old CompileConsole — stays mounted after the build finishes.
 * Collapsible, not auto-dismissed: it's there to prove the sketch actually
 * "compiled and uploaded" for as long as that project is loaded, not just
 * flash by. Also offers "open in new tab" for the source + log.
 */
export function ConsolePanel({ request, onFirmwareLoaded, onError, onStreamingChange }: ConsolePanelProps) {
  const { dispatch } = useSimulator()
  const [isOpen, setIsOpen] = useState(true)
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
      const board = createPlacedComponent(def, 160, 140)
      dispatch({ type: "ADD_COMPONENT", component: board })
      dispatch({ type: "SET_RUNNING", isRunning: true })
      onFirmwareLoaded({ componentId: board.id, hex: project.hex })
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

    timeoutId = setTimeout(() => revealNext(0), 200)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
    // Re-run for every new request (new project OR same project re-clicked),
    // driven by `token` — not by object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.token])

  if (!request) return null
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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-2 pb-2 sm:px-4">
      <div className="pointer-events-auto w-full max-w-3xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left"
        >
          {isStreaming ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0 text-green-500" />
          )}
          <p className="truncate text-sm font-medium text-foreground">
            {project.name} — {isStreaming ? "Compiling…" : "Upload complete"}
          </p>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
            <Cpu className="size-3" />
            {project.board}
          </span>
          <span
            role="button"
            title="Open source + build log in a new tab"
            onClick={(e) => {
              e.stopPropagation()
              openInNewTab()
            }}
            className="ml-1 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
          </span>
          {isOpen ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>

        {isOpen && (
          <>
            <div className="max-h-32 overflow-y-auto border-b border-border bg-muted/40 px-4 py-3">
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
                {project.source}
              </pre>
            </div>
            <div className="max-h-32 overflow-y-auto bg-[oklch(0.15_0.02_250)] px-4 py-3 font-mono text-[11px] leading-relaxed">
              {project.buildLog.slice(0, visibleLines).map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "animate-in fade-in slide-in-from-left-1 duration-150",
                    line.startsWith("avr-") ? "text-amber-400/90" : "text-neutral-300"
                  )}
                >
                  <span className="select-none text-neutral-500">{"> "}</span>
                  {line}
                </div>
              ))}
              {isStreaming && (
                <span className="inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-neutral-400" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
