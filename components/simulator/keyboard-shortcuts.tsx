"use client"

import { X, Keyboard } from "lucide-react"
import { cn } from "@/lib/utils"

const SHORTCUTS = [
  { keys: ["Space"], action: "Toggle simulation run/stop" },
  { keys: ["Ctrl/Cmd", "Z"], action: "Undo" },
  { keys: ["Ctrl/Cmd", "Shift", "Z"], action: "Redo" },
  { keys: ["Ctrl/Cmd", "D"], action: "Duplicate selected component" },
  { keys: ["Delete"], action: "Remove selected component or wire" },
  { keys: ["Esc"], action: "Deselect / cancel wire" },
  { keys: ["Scroll"], action: "Zoom canvas" },
  { keys: ["Drag"], action: "Pan canvas (empty area)" },
  { keys: ["Click pin"], action: "Start / finish a wire" },
] as const

interface KeyboardShortcutsProps {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-labelledby="shortcuts-title"
        className="fixed left-1/2 top-1/2 z-50 w-[min(90vw,24rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Keyboard className="size-4 text-primary" />
            <h2 id="shortcuts-title" className="text-sm font-semibold">
              Keyboard &amp; Mouse
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <ul className="space-y-2 p-4">
          {SHORTCUTS.map(({ keys, action }) => (
            <li key={action} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{action}</span>
              <div className="flex shrink-0 gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className={cn(
                      "rounded-md border border-border bg-muted px-1.5 py-0.5",
                      "font-mono text-[10px] font-medium text-foreground",
                    )}
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
