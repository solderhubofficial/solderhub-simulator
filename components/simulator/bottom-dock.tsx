"use client"

import { useMemo } from "react"
import { ChevronUp } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { inspectCircuit } from "@/lib/simulator/circuit-checks"
import type { SerialLine } from "@/hooks/simulator/use-serial-log"
import type { RightTool } from "@/components/simulator/tool-rail"
import { cn } from "@/lib/utils"

interface BottomDockProps {
  activePanel: RightTool
  consoleOpen: boolean
  lastLine: SerialLine | undefined
  error: string | null
  isLoadingProject: boolean
  onClearError: () => void
  onTogglePanel: (tool: Exclude<RightTool, null>) => void
  onToggleConsole: () => void
}

/** Collapsed bottom dock: Serial, Console, Plotter and Circuit check, plus the latest serial line. */
export function BottomDock({ activePanel, consoleOpen, lastLine, error, isLoadingProject, onClearError, onTogglePanel, onToggleConsole }: BottomDockProps) {
  const { state, getPinsForComponent } = useSimulator()
  const issues = useMemo(
    () => inspectCircuit(state.components, state.wires, getComponentDefinition, getPinsForComponent).filter((c) => c.severity !== "info").length,
    [state.components, state.wires, getPinsForComponent],
  )
  const tab = (active: boolean) =>
    cn(
      "tap-pad flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] transition-colors",
      active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
    )
  const expanded = activePanel === "monitor" || activePanel === "plotter"

  return (
    <footer className="hidden h-11 shrink-0 items-center gap-1 border-t border-border bg-card px-3 sm:flex">
      <button type="button" aria-pressed={activePanel === "monitor"} onClick={() => onTogglePanel("monitor")} className={tab(activePanel === "monitor")}>Serial</button>
      <button type="button" aria-pressed={consoleOpen} onClick={onToggleConsole} className={tab(consoleOpen)}>Console</button>
      <button type="button" aria-pressed={activePanel === "plotter"} onClick={() => onTogglePanel("plotter")} className={tab(activePanel === "plotter")}>Plotter</button>
      <button type="button" aria-pressed={activePanel === "check"} onClick={() => onTogglePanel("check")} className={tab(activePanel === "check")}>
        Circuit check
        <span className={cn("rounded-full px-2 py-px text-xs font-semibold", issues === 0 ? "bg-status-running/15 text-status-running" : "bg-status-idle/20 text-status-idle")}>
          {issues === 0 ? "OK" : issues}
        </span>
      </button>

      {isLoadingProject && <span className="ml-3 text-xs text-muted-foreground">Loading project…</span>}
      {error && (
        <button type="button" onClick={onClearError} title={`${error} (click to dismiss)`} className="ml-3 min-w-0 flex-1 truncate text-left text-xs text-status-error">
          {error}
        </button>
      )}
      <div className="flex-1" />
      {lastLine && !error && (
        <span className="hidden min-w-0 max-w-[40%] truncate font-mono text-xs text-muted-foreground sm:block">&gt; {lastLine.text}</span>
      )}
      <button
        type="button"
        onClick={() => onTogglePanel("monitor")}
        aria-label={expanded ? "Collapse dock" : "Expand dock"}
        title={expanded ? "Collapse dock" : "Expand dock"}
        className="tap-pad flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ChevronUp className={cn("size-4 transition-transform", expanded && "rotate-180")} />
      </button>
    </footer>
  )
}
