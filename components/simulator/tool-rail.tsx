"use client"

import { useEffect, useState } from "react"
import {
  Activity,
  Code2,
  Component,
  Folder,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  Terminal,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type RightTool = "monitor" | "plotter" | null

interface SimulatorToolRailProps {
  partsOpen: boolean
  activePanel: RightTool
  codeOpen: boolean
  onToggleParts: () => void
  onTogglePanel: (tool: Exclude<RightTool, null>) => void
  onToggleCode: () => void
  onOpenMyProjects: () => void
}

const PIN_KEY = "simulator:rail-labels"

/**
 * Left tool rail. Shows icon + name so new users can tell what each tool is,
 * and folds down to icons only when a work tab (serial monitor/plotter, code
 * editor) is open and needs the room -- or when the user collapses it.
 */
export function SimulatorToolRail({
  partsOpen,
  activePanel,
  codeOpen,
  onToggleParts,
  onTogglePanel,
  onToggleCode,
  onOpenMyProjects,
}: SimulatorToolRailProps) {
  const [pinned, setPinned] = useState(true)
  const [wide, setWide] = useState(false)

  useEffect(() => {
    try { if (window.localStorage.getItem(PIN_KEY) === "off") setPinned(false) } catch { /* storage unavailable */ }
    const query = window.matchMedia("(min-width: 1100px)")
    const update = () => setWide(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  const tabOpen = codeOpen || activePanel !== null
  const expanded = pinned && wide && !tabOpen

  const togglePinned = () => {
    setPinned((value) => {
      try { window.localStorage.setItem(PIN_KEY, value ? "off" : "on") } catch { /* storage unavailable */ }
      return !value
    })
  }

  return (
    <aside
      aria-label="Workbench tools"
      className={cn(
        "relative z-40 flex shrink-0 flex-col border-r border-border/80 bg-card/95 py-2 shadow-[1px_0_0_rgba(0,0,0,0.02)] transition-[width] duration-200",
        expanded ? "w-44 items-stretch" : "w-12 items-center",
      )}
    >
      <div className="flex w-full flex-1 flex-col gap-0.5 px-1.5">
        <Section label="Build" expanded={expanded} />
        <RailButton icon={Component} label="Parts" hint="Boards, sensors & parts library" expanded={expanded} active={partsOpen} onClick={onToggleParts} />
        <RailButton icon={Code2} label="Code Editor" hint="Write and run an Arduino sketch" expanded={expanded} active={codeOpen} onClick={onToggleCode} />

        <Section label="Debug" expanded={expanded} />
        <RailButton icon={Terminal} label="Serial Monitor" hint="Read Serial.print() output" expanded={expanded} active={activePanel === "monitor"} onClick={() => onTogglePanel("monitor")} />
        <RailButton icon={Activity} label="Serial Plotter" hint="Plot numeric Serial values live" expanded={expanded} active={activePanel === "plotter"} onClick={() => onTogglePanel("plotter")} />

        <Section label="Projects" expanded={expanded} />
        <RailButton icon={Folder} label="My Projects" hint="Your saved circuits" expanded={expanded} active={false} onClick={onOpenMyProjects} />
        <RailButton
          icon={Globe}
          label="Community"
          hint="Browse public projects"
          expanded={expanded}
          active={false}
          onClick={() => window.dispatchEvent(new CustomEvent("simulator:open-public-projects"))}
        />
      </div>

      {wide && (
        <div className="mt-2 border-t border-border/70 px-1.5 pt-2">
          <button
            type="button"
            onClick={togglePinned}
            disabled={tabOpen}
            aria-label={pinned ? "Show icons only" : "Show tool names"}
            title={tabOpen ? "Names return when the open tab is closed" : pinned ? "Show icons only" : "Show tool names"}
            className={cn(
              "flex h-8 w-full items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-40",
              expanded ? "gap-2 px-2.5" : "justify-center",
            )}
          >
            {pinned ? <PanelLeftClose className="size-4 shrink-0" /> : <PanelLeftOpen className="size-4 shrink-0" />}
            {expanded && <span className="text-xs font-medium">Collapse</span>}
          </button>
        </div>
      )}
    </aside>
  )
}

function Section({ label, expanded }: { label: string; expanded: boolean }) {
  if (!expanded) return <div className="mx-auto my-1.5 h-px w-7 bg-border first:hidden" />
  return <p className="mt-3 px-2.5 pb-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70 first:mt-1">{label}</p>
}

function RailButton({
  icon: Icon,
  label,
  hint,
  expanded,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  hint: string
  expanded: boolean
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={expanded ? hint : `${label} — ${hint}`}
      className={cn(
        "group flex shrink-0 items-center rounded-lg border transition-colors duration-150 tap-pad",
        expanded ? "h-9 gap-2.5 px-2.5" : "mx-auto size-9 justify-center",
        active
          ? "border-primary/30 bg-primary/12 text-primary shadow-sm"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {expanded ? <span className="truncate text-[13px] font-medium">{label}</span> : <span className="sr-only">{label}</span>}
    </button>
  )
}
