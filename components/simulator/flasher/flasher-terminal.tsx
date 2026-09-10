"use client"

import { useEffect, useRef } from "react"
import { Copy, Trash2, TerminalSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FlasherLogLine, FlasherPhase } from "@/hooks/simulator/use-esp-flasher"

interface FlasherTerminalProps {
  logs: FlasherLogLine[]
  phase: FlasherPhase
  progress: number
  bytesWritten: number
  bytesTotal: number
  sessionLabel: string
  onCopy: () => void
  onClear: () => void
}

export function FlasherTerminal({
  logs,
  phase,
  progress,
  bytesWritten,
  bytesTotal,
  sessionLabel,
  onCopy,
  onClear,
}: FlasherTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [logs])

  const isActive = phase === "flashing" || phase === "erasing"

  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-[oklch(0.3_0.03_260)] bg-[oklch(0.15_0.02_260)] shadow-lg">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-white/60">
          <TerminalSquare className="size-3.5 shrink-0 text-white/40" />
          <span className="truncate">{sessionLabel}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onCopy}
            title="Copy log"
            className="size-7 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <Copy className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onClear}
            title="Clear log"
            className="size-7 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed">
        {logs.length === 0 ? (
          <p className="text-white/35">Connect a device to see live output here.</p>
        ) : (
          logs.map((line) => <LogLine key={line.id} text={line.text} />)
        )}
      </div>

      {isActive && (
        <footer className="border-t border-white/10 px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-white/50">
            <span>{phase === "flashing" ? "Writing flash" : "Erasing flash"}</span>
            {phase === "flashing" && bytesTotal > 0 && (
              <span>
                {bytesWritten.toLocaleString()} / {bytesTotal.toLocaleString()} bytes
              </span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[oklch(0.72_0.17_52)] transition-all duration-200"
              style={{ width: phase === "flashing" ? `${progress}%` : "100%" }}
            />
          </div>
        </footer>
      )}
    </section>
  )
}

function LogLine({ text }: { text: string }) {
  const lower = text.toLowerCase()
  const tone = lower.includes("fail") || lower.includes("error") || lower.includes("cancelled")
    ? "text-[oklch(0.75_0.15_25)]"
    : lower.includes("warning")
      ? "text-[oklch(0.8_0.14_75)]"
      : lower.includes("complete") || lower.includes("success") || lower.includes("erased")
        ? "text-[oklch(0.78_0.14_145)]"
        : "text-white/80"

  return <div className={`whitespace-pre-wrap ${tone}`}>{text}</div>
}
