"use client"

import {
  CircuitBoard,
  MousePointerClick,
  Cable,
  Play,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PROJECTS, type SimulatorProject } from "@/lib/simulator/firmware/projects"

interface WelcomeOverlayProps {
  onRequestProject: (project: SimulatorProject) => void
  onDismiss: () => void
}

export function WelcomeOverlay({ onRequestProject, onDismiss }: WelcomeOverlayProps) {
  const featured = PROJECTS[0]

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-lg animate-in fade-in zoom-in-95 duration-400">
        <div className="overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-md">
          {/* Header gradient strip */}
          <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-inner">
                <CircuitBoard className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Build your circuit
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Drag parts from the library, wire pins together, and run real AVR firmware in your browser.
                </p>
              </div>
            </div>
          </div>

          {/* Quick start steps */}
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <StepCard
              icon={MousePointerClick}
              title="Add parts"
              description="Drag components onto the canvas"
            />
            <StepCard
              icon={Cable}
              title="Wire pins"
              description="Click two pins to connect"
            />
            <StepCard
              icon={Play}
              title="Simulate"
              description="Press Run to see it work"
            />
          </div>

          {/* Featured project */}
          {featured && (
            <div className="border-t border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                Quick start
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{featured.name}</p>
                  <p className="text-xs text-muted-foreground">{featured.description}</p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => onRequestProject(featured)}
                >
                  Load demo
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-border px-5 py-3">
            <Button size="sm" variant="ghost" onClick={onDismiss} className="text-muted-foreground">
              Start from scratch
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center">
      <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{description}</p>
    </div>
  )
}
