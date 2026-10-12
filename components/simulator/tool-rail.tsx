"use client"

import {
  Activity,
  Blocks,
  Code2,
  Cpu,
  Folder,
  FolderOpen,
  LayoutGrid,
  Terminal,
} from "lucide-react"

export type RightTool = "board" | "monitor" | "plotter" | null

interface SimulatorToolRailProps {
  partsOpen: boolean
  activePanel: RightTool
  codeOpen: boolean
  onToggleParts: () => void
  onTogglePanel: (tool: Exclude<RightTool, null>) => void
  onToggleCode: () => void
  onOpenMyProjects: () => void
}

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
      className="relative z-40 flex w-12 shrink-0 flex-col items-center border-r border-border/80 bg-card/95 py-2 shadow-[1px_0_0_rgba(0,0,0,0.02)]"
    >
      <div className="mb-2 flex size-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary" title="SolderHub Circuit Lab">
        <Blocks className="size-4" />
      </div>

      <div className="flex w-full flex-1 flex-col items-center gap-1 px-1">
        <RailButton icon={LayoutGrid} label="Parts library" active={partsOpen} onClick={onToggleParts} />
        <div className="my-1 h-px w-7 bg-border" />
        <RailButton icon={Cpu} label="Board info & properties" active={activePanel === "board"} onClick={() => onTogglePanel("board")} />
        <RailButton icon={Terminal} label="Serial monitor" active={activePanel === "monitor"} onClick={() => onTogglePanel("monitor")} />
        <RailButton icon={Activity} label="Serial plotter" active={activePanel === "plotter"} onClick={() => onTogglePanel("plotter")} />
        <RailButton icon={Code2} label="Code editor" active={codeOpen} onClick={onToggleCode} />
        <div className="my-1 h-px w-7 bg-border" />
        <RailButton icon={Folder} label="My projects (saved on this device)" active={false} onClick={onOpenMyProjects} />
        <RailButton
          icon={FolderOpen}
          label="Projects library"
          active={false}
          onClick={() => window.dispatchEvent(new CustomEvent("simulator:open-projects"))}
        />
      </div>

      <div className="mt-2 flex flex-col items-center gap-1 border-t border-border/70 pt-2">
        <span className="font-mono text-[8px] font-bold tracking-wide text-muted-foreground/70">LAB</span>
      </div>
    </aside>
  )
}

function RailButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof LayoutGrid
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`group flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150 tap-pad ${
        active
          ? "border-primary/30 bg-primary/12 text-primary shadow-sm"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="size-4" />
      <span className="sr-only">{label}</span>
    </button>
  )
}
