"use client"

import { Check, Usb, FileCode, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export type FlasherStepId = "connect" | "firmware" | "flash"

interface StepMeta {
  id: FlasherStepId
  label: string
  hint: string
  icon: typeof Usb
}

const STEPS: StepMeta[] = [
  { id: "connect", label: "Connect", hint: "Select the device", icon: Usb },
  { id: "firmware", label: "Firmware", hint: "Choose what to flash", icon: FileCode },
  { id: "flash", label: "Flash", hint: "Write to the board", icon: Zap },
]

interface FlasherStepRailProps {
  activeStep: FlasherStepId
  completedSteps: Set<FlasherStepId>
  disabledSteps: Set<FlasherStepId>
  onSelectStep: (step: FlasherStepId) => void
}

export function FlasherStepRail({ activeStep, completedSteps, disabledSteps, onSelectStep }: FlasherStepRailProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto lg:w-56 lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-visible">
      {STEPS.map((step, index) => {
        const isActive = step.id === activeStep
        const isComplete = completedSteps.has(step.id)
        const isDisabled = disabledSteps.has(step.id)
        const Icon = step.icon

        return (
          <button
            key={step.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelectStep(step.id)}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors lg:shrink",
              isActive ? "bg-primary/10" : "hover:bg-accent/60",
              isDisabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                isComplete
                  ? "border-transparent bg-status-running text-white"
                  : isActive
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {isComplete ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  isActive ? "text-foreground" : "text-foreground/80",
                )}
              >
                <Icon className="size-3.5 opacity-70" />
                {step.label}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">{step.hint}</span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}
