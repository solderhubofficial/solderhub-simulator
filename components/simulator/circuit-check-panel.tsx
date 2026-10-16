"use client"

import { useMemo } from "react"
import { AlertTriangle, CheckCircle2, Info, ShieldCheck, X } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { inspectCircuit } from "@/lib/simulator/circuit-checks"

const SEVERITY_UI = {
  error: {
    icon: AlertTriangle,
    label: "Needs attention",
    className: "border-red-500/25 bg-red-500/[0.06] text-red-700 dark:text-red-300",
  },
  warning: {
    icon: AlertTriangle,
    label: "Check this",
    className: "border-amber-500/25 bg-amber-500/[0.06] text-amber-800 dark:text-amber-200",
  },
  info: {
    icon: Info,
    label: "Information",
    className: "border-border bg-muted/35 text-foreground",
  },
} as const

export function CircuitCheckPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch, getPinsForComponent } = useSimulator()
  const checks = useMemo(
    () => inspectCircuit(state.components, state.wires, getComponentDefinition, getPinsForComponent),
    [state.components, state.wires, getPinsForComponent],
  )
  const issues = checks.filter((check) => check.severity !== "info").length
  const Icon = issues === 0 ? CheckCircle2 : ShieldCheck

  return (
    <aside
      aria-label="Circuit Coach"
      className="absolute inset-y-0 right-0 z-30 flex w-[min(380px,92vw)] flex-col border-l border-border bg-background/98 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-4 duration-200"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border/80 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Icon className="size-[18px]" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">Circuit Coach</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Practical wiring checks for your current canvas
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Circuit Coach"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <p className="text-xs font-semibold">{issues === 0 ? "No obvious wiring issues" : `${issues} item${issues === 1 ? "" : "s"} to review`}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {state.components.length} parts · {state.wires.length} wires
          </p>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
          Beta
        </span>
      </div>

      <div className="sim-scrollbar flex-1 space-y-3 overflow-y-auto p-3">
        {checks.map((check) => {
          const ui = SEVERITY_UI[check.severity]
          const CheckIcon = ui.icon
          return (
            <section key={check.id} className={`rounded-xl border p-3 ${ui.className}`}>
              <div className="flex items-start gap-2.5">
                <CheckIcon className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-relaxed">{check.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed opacity-85">{check.detail}</p>
                  {check.componentId && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "SELECT_COMPONENT", id: check.componentId ?? null })}
                      className="mt-2 text-[11px] font-semibold underline underline-offset-4 hover:no-underline"
                    >
                      Select component
                    </button>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <footer className="border-t border-border/80 bg-muted/20 p-3">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Circuit Coach checks explicit wire endpoints and a small set of common sensor pinouts. It does not yet calculate current, detect every short circuit, validate board voltage compatibility, or emulate sensor protocols. Always verify real hardware pinouts before powering a circuit.
        </p>
      </footer>
    </aside>
  )
}
