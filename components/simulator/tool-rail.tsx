"use client"

import {
  Activity,
  Code2,
  Blocks,
  Folder,
  Globe,
  Terminal,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type RightTool = "monitor" | "plotter" | "check" | null

interface SimulatorToolRailProps {
  partsOpen: boolean
  activePanel: RightTool
  codeOpen: boolean
  onToggleParts: () => void
  onTogglePanel: (tool: Exclude<RightTool, null>) => void
  onToggleCode: () => void
  onOpenMyProjects: () => void
}

/** Compact workbench navigation: clear icons with short labels, without a bulky expanding sidebar. */
export function SimulatorToolRail({
  partsOpen,
  activePanel,
  codeOpen,
  onToggleParts,
  onTogglePanel,
  onToggleCode,
  onOpenMyProjects,
}: SimulatorToolRailProps) {
  return (
    <aside
      aria-label="Workbench tools"
      className="relative z-40 flex w-[56px] shrink-0 flex-col items-stretch border-r border-border/70 bg-card/95 py-2 shadow-[1px_0_0_rgba(0,0,0,0.02)] sm:w-[76px]"
    >
      <div className="flex w-full flex-1 flex-col items-center gap-1 px-1.5">
        <RailButton icon={Blocks} label="Components" hint="Boards, sensors and component library" active={partsOpen} onClick={onToggleParts} />
        <RailButton icon={Code2} label="Code" hint="Write and run an Arduino sketch" active={codeOpen} onClick={onToggleCode} />

        <div aria-hidden="true" className="my-1.5 h-px w-8 bg-border/80" />

        <RailButton icon={Terminal} label="Monitor" hint="Read Serial.print() output" active={activePanel === "monitor"} onClick={() => onTogglePanel("monitor")} />
        <RailButton icon={Activity} label="Plotter" hint="Plot numeric Serial values live" active={activePanel === "plotter"} onClick={() => onTogglePanel("plotter")} />
        <RailButton icon={ShieldCheck} label="Circuit check" hint="Review wiring and common sensor pin connections" active={activePanel === "check"} onClick={() => onTogglePanel("check")} />

        <div aria-hidden="true" className="my-1.5 h-px w-8 bg-border/80" />

        <RailButton icon={Folder} label="Saved" hint="Your saved circuits" active={false} onClick={onOpenMyProjects} />
        <RailButton
          icon={Globe}
          label="Examples"
          hint="Working example circuits to open and change"
          active={false}
          onClick={() => window.dispatchEvent(new CustomEvent("simulator:open-public-projects"))}
        />
      </div>
      <div className="px-2 pb-1 pt-2 text-center">
        <span className="font-mono text-[9px] font-semibold tracking-wide text-muted-foreground/50">SH</span>
      </div>
    </aside>
  )
}

function RailButton({
  icon: Icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  hint: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={`${label} — ${hint}`}
      className={cn(
        "group flex h-[58px] w-full shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-0.5 transition-all duration-150 tap-pad focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active
          ? "border-primary/25 bg-primary/10 text-primary shadow-sm"
          : "border-transparent text-muted-foreground hover:border-border/80 hover:bg-muted/80 hover:text-foreground",
      )}
    >
      <span className={cn("flex size-7 items-center justify-center rounded-lg transition-colors", active ? "bg-primary/10" : "group-hover:bg-background")}>
        <Icon className="size-[17px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
      </span>
      <span className={cn("max-w-full truncate text-[10px] leading-none", active ? "font-semibold" : "font-medium")}>{label}</span>
    </button>
  )
}
