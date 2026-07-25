"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Cpu, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CompileConsoleProps {
  /** Sketch source shown above the terminal, e.g. BLINK_SOURCE. */
  source: string
  /** Lines streamed into the terminal one at a time, e.g. BLINK_BUILD_LOG. */
  buildLog: string[]
  /** Called once every line has streamed in and the short "done" pause elapses. */
  onComplete: () => void
}

/**
 * Illustrative build console shown while a hardcoded demo firmware "loads".
 * The lines it streams are real avr-gcc/avrdude-style output for the sketch
 * being loaded, but nothing is actually compiled here — the hex that
 * eventually reaches avr8js is the same pre-built constant either way. This
 * exists purely so loading a demo *reads* like a real Arduino IDE build
 * rather than an instant, unexplained state change.
 */
export function CompileConsole({ source, buildLog, onComplete }: CompileConsoleProps) {
  const [visibleLines, setVisibleLines] = useState(0)
  const [done, setDone] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    const revealNext = (index: number) => {
      if (cancelled) return
      if (index >= buildLog.length) {
        setDone(true)
        timeoutId = setTimeout(() => {
          if (!cancelled) onCompleteRef.current()
        }, 500)
        return
      }
      setVisibleLines(index + 1)
      // Vary delay a bit so it doesn't read as a mechanical fixed tick —
      // compiler/linker lines pause a touch longer than plain log lines.
      const line = buildLog[index]
      const delay = line.startsWith("avr-gcc") || line.startsWith("avr-objcopy") ? 420 : 220
      timeoutId = setTimeout(() => revealNext(index + 1), delay)
    }

    timeoutId = setTimeout(() => revealNext(0), 200)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
    // buildLog is a stable constant reference per demo; re-running this
    // effect only on mount is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-[min(640px,92vw)] overflow-hidden rounded-lg border border-border bg-card shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          {done ? (
            <CheckCircle2 className="size-4 text-green-500" />
          ) : (
            <Loader2 className="size-4 animate-spin text-primary" />
          )}
          <p className="text-sm font-medium text-foreground">
            {done ? "Upload complete" : "Compiling sketch"}
          </p>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Cpu className="size-3" />
            ATmega328P
          </div>
        </div>

        <div className="max-h-40 overflow-y-auto border-b border-border bg-muted/40 px-4 py-3">
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
            {source}
          </pre>
        </div>

        <div className="bg-[oklch(0.15_0.02_250)] px-4 py-3 font-mono text-[11px] leading-relaxed">
          {buildLog.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className={cn(
                "animate-in fade-in slide-in-from-left-1 duration-150",
                line.startsWith("avr-") ? "text-amber-400/90" : "text-neutral-300"
              )}
            >
              <span className="select-none text-neutral-500">{"> "}</span>
              {line}
            </div>
          ))}
          {!done && (
            <span className="inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-neutral-400" />
          )}
        </div>
      </div>
    </div>
  )
}
