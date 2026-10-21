"use client"

import { Laptop, Moon, Sun, type LucideIcon } from "lucide-react"
import { useTheme, type ThemePreference } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
]

/** Three-way System / Light / Dark switch. "System" follows the OS live. */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn("inline-flex items-center gap-0.5 rounded-xl border border-border bg-card/70 p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={`${label} theme`}
            onClick={() => setPreference(value)}
            className={cn(
              "tap-pad flex size-7 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        )
      })}
    </div>
  )
}
