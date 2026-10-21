"use client"

import {
  Code2,
  Blocks,
  Folder,
  Globe,
  CircleHelp,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type RightTool = "monitor" | "plotter" | "check" | null

interface SimulatorToolRailProps {
  partsOpen: boolean
  codeOpen: boolean
  onToggleParts: () => void
  onToggleCode: () => void
  onOpenMyProjects: () => void
  onOpenHelp: () => void
}

/** Compact workbench navigation: clear icons with short labels, without a bulky expanding sidebar. */
export function SimulatorToolRail({
  partsOpen,
  codeOpen,
  onToggleParts,
  onToggleCode,
  onOpenMyProjects,
  onOpenHelp,
}: SimulatorToolRailProps) {
  return (
    <aside
      aria-label="Workbench tools"
      className="relative z-40 flex w-[56px] shrink-0 flex-col items-stretch border-r border-border bg-card py-3 sm:w-[72px]"
    >
      <div className="flex w-full flex-1 flex-col items-center gap-1.5 px-2">
        <RailButton icon={Blocks} label="Parts" hint="Boards, sensors and component library" active={partsOpen} onClick={onToggleParts} />
        <RailButton icon={Code2} label="Code" hint="Write and run an Arduino sketch" active={codeOpen} onClick={onToggleCode} />
        <RailButton
          icon={Globe}
          label="Examples"
          hint="Working example circuits to open and change"
          active={false}
          onClick={() => window.dispatchEvent(new CustomEvent("simulator:open-public-projects"))}
        />
        <RailButton icon={Folder} label="Saved" hint="Your saved circuits" active={false} onClick={onOpenMyProjects} />
        <div className="flex-1" />
        <RailButton icon={CircleHelp} label="Help" hint="Keyboard shortcuts and tips" active={false} onClick={onOpenHelp} />
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
        "group flex w-14 shrink-0 flex-col items-center gap-1 rounded-[10px] py-2 px-0.5 transition-all duration-150 tap-pad focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active
          ? "bg-muted text-primary"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      <Icon className="size-[22px] shrink-0" strokeWidth={1.8} />
      <span className="max-w-none whitespace-nowrap text-[11px] font-medium leading-none">{label}</span>
    </button>
  )
}
