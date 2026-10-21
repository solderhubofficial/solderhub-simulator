"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { AlertTriangle, Copy, Download, Radio, Search, Send, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { BAUD_RATES, LINE_ENDINGS, type LineEndingId, type SerialLog } from "@/hooks/simulator/use-serial-log"

function formatTime(ms: number) {
  const d = new Date(ms)
  const p = (n: number, w = 2) => String(n).padStart(w, "0")
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const selectClass = "h-7 rounded-md border border-border bg-background px-1.5 font-mono text-[11px] text-foreground outline-none focus-visible:border-primary"

interface SerialMonitorViewProps {
  serial: SerialLog
  /** A firmware image is loaded (so output can ever appear). */
  runtimeAvailable: boolean
  /** The simulation is running right now (so input can be delivered). */
  canSend: boolean
}

/** Arduino-IDE-style serial monitor: output, send box, and a footer with autoscroll / timestamp / line ending / baud. */
export function SerialMonitorView({ serial, runtimeAvailable, canSend }: SerialMonitorViewProps) {
  const { lines, partial, deviceBaud, selectedBaud, setSelectedBaud, clear, send } = serial
  const [autoScroll, setAutoScroll] = useState(true)
  const [showTimestamps, setShowTimestamps] = useState(false)
  const [filter, setFilter] = useState("")
  const [input, setInput] = useState("")
  const [ending, setEnding] = useState<LineEndingId>("nl")
  const [history, setHistory] = useState<string[]>([])
  const historyIndex = useRef(-1)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight
  }, [autoScroll, lines, partial])

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? lines.filter((l) => l.text.toLowerCase().includes(q)) : lines
  }, [lines, filter])

  const mismatch = deviceBaud !== null && deviceBaud !== selectedBaud

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSend || input.length === 0) return
    send(input, ending)
    setHistory((h) => [input, ...h.filter((x) => x !== input)].slice(0, 30))
    historyIndex.current = -1
    setInput("")
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
    event.preventDefault()
    const next = historyIndex.current + (event.key === "ArrowUp" ? 1 : -1)
    if (next < -1 || next >= history.length) return
    historyIndex.current = next
    setInput(next === -1 ? "" : history[next])
  }

  const plainText = () => lines.map((l) => (showTimestamps ? `[${formatTime(l.time)}] ` : "") + l.text).join("\n")

  return (
    <div className="flex h-full min-h-0 flex-col">
      {mismatch && (
        <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1">Sketch uses <b>{deviceBaud!.toLocaleString()}</b> baud but the monitor is set to <b>{selectedBaud.toLocaleString()}</b> — output is garbled.</span>
          <button type="button" onClick={() => setSelectedBaud(deviceBaud!)} className="shrink-0 rounded border border-amber-500/40 px-2 py-0.5 font-semibold hover:bg-amber-500/15">Switch to {deviceBaud!.toLocaleString()}</button>
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter output…" aria-label="Filter serial output" className="min-w-0 flex-1 bg-transparent font-mono text-[11px] outline-none placeholder:text-muted-foreground" />
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{filter ? `${visible.length}/` : ""}{lines.length} lines</span>
      </div>

      <div
        ref={terminalRef}
        onScroll={(e) => {
          const el = e.currentTarget
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
          if (!atBottom && autoScroll) setAutoScroll(false)
          else if (atBottom && !autoScroll) setAutoScroll(true)
        }}
        className="sim-scrollbar min-h-0 flex-1 overflow-y-auto bg-background px-3 py-2 font-mono text-xs leading-[1.55] text-foreground/90"
        role="log"
        aria-live="off"
      >
        {visible.length === 0 && !partial ? (
          <div className="flex h-full min-h-16 flex-col items-center justify-center text-center">
            <Radio className="size-5 text-primary/50" />
            <p className="mt-1.5 text-xs font-semibold">{runtimeAvailable ? "Waiting for serial output" : "Serial bridge offline"}</p>
            <p className="mt-0.5 max-w-72 text-[10px] leading-relaxed text-muted-foreground">
              {runtimeAvailable ? "Serial.print() output from the running sketch appears here." : "Upload a sketch (or load a project) to start the simulation."}
            </p>
          </div>
        ) : (
          <>
            {visible.map((line) => (
              <div key={line.id} className="flex gap-3 whitespace-pre-wrap break-words">
                {showTimestamps && <span className="shrink-0 select-none text-muted-foreground/70">{formatTime(line.time)}</span>}
                <span>{line.text || " "}</span>
              </div>
            ))}
            {partial && !filter && <div className="whitespace-pre-wrap break-words text-muted-foreground">{partial}<span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-primary" /></div>}
          </>
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border/70 bg-card px-3 py-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!canSend}
          placeholder={canSend ? "Message (Enter to send to Serial.read())  ·  ↑ history" : "Upload and run a sketch to send input"}
          aria-label="Serial input"
          className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 font-mono text-[11px] outline-none focus-visible:border-primary disabled:opacity-50"
        />
        <button type="submit" disabled={!canSend || input.length === 0} className="flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-[11px] font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">
          <Send className="size-3" /> Send
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/70 bg-muted/40 px-3 py-1">
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground"><input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="size-3 accent-[var(--primary)]" />Autoscroll</label>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground"><input type="checkbox" checked={showTimestamps} onChange={(e) => setShowTimestamps(e.target.checked)} className="size-3 accent-[var(--primary)]" />Timestamp</label>
        <div className="ml-auto flex items-center gap-1.5">
          <select value={ending} onChange={(e) => setEnding(e.target.value as LineEndingId)} aria-label="Line ending" className={selectClass}>
            {LINE_ENDINGS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <select value={selectedBaud} onChange={(e) => setSelectedBaud(Number(e.target.value))} aria-label="Baud rate" className={cn(selectClass, mismatch && "border-amber-500/60")}>
            {BAUD_RATES.map((rate) => <option key={rate} value={rate}>{rate.toLocaleString()} baud</option>)}
          </select>
          <button type="button" title="Copy output" aria-label="Copy output" disabled={lines.length === 0} onClick={() => void navigator.clipboard?.writeText(plainText()).catch(() => undefined)} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"><Copy className="size-3.5" /></button>
          <button type="button" title="Download .txt" aria-label="Download output" disabled={lines.length === 0} onClick={() => download("serial-log.txt", plainText())} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"><Download className="size-3.5" /></button>
          <button type="button" title="Clear output" aria-label="Clear output" onClick={clear} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><Trash2 className="size-3.5" /></button>
        </div>
      </div>
    </div>
  )
}
