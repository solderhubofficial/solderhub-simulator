"use client"

import { Blocks, Code2, Globe, Plus, Terminal, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileNavProps {
  view: "circuit" | "code" | "monitor"
  onCircuit: () => void
  onCode: () => void
  onMonitor: () => void
  onExamples: () => void
  onAddPart: () => void
}

/** Phone layout: bottom tab bar (Circuit, Code, Monitor, Examples) and an "Add part" button over the canvas. */
export function MobileNav({ view, onCircuit, onCode, onMonitor, onExamples, onAddPart }: MobileNavProps) {
  return (
    <>
      <button
        type="button"
        onClick={onAddPart}
        className="fixed bottom-20 right-4 z-30 flex h-[52px] items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-[15px] font-semibold text-primary-foreground shadow-xl shadow-black/30 sm:hidden"
      >
        <Plus className="size-[18px]" strokeWidth={2.6} />
        Add part
      </button>
      <nav aria-label="Views" className="z-40 flex h-16 shrink-0 border-t border-border bg-card sm:hidden">
        <Tab icon={Blocks} label="Circuit" active={view === "circuit"} onClick={onCircuit} />
        <Tab icon={Code2} label="Code" active={view === "code"} onClick={onCode} />
        <Tab icon={Terminal} label="Monitor" active={view === "monitor"} onClick={onMonitor} />
        <Tab icon={Globe} label="Examples" active={false} onClick={onExamples} />
      </nav>
    </>
  )
}

function Tab({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn("flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium", active ? "text-primary" : "text-muted-foreground")}
    >
      <Icon className="size-[22px]" strokeWidth={1.8} />
      {label}
    </button>
  )
}
