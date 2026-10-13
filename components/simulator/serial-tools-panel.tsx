"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownToLine, Activity, Clock, Copy, Download, Pause, Play, Radio, Search, Send, Terminal, Trash2, X } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { cn } from "@/lib/utils"

type SerialToolMode = "monitor" | "plotter"

interface SerialToolsPanelProps {
  mode: SerialToolMode
  onClose: () => void
  runtimeAvailable: boolean
}

type NumericSnapshot = Record<string, number>
type SerialLine = { id: number; time: number; text: string }

const TRACE_COLORS = ["#4DA3FF", "#FF8A24", "#3DD68C", "#B69CFF", "#FF6B9A", "#F2C94C"]
const MAX_LINES = 1000
const MAX_SAMPLES = 600
const WINDOWS = [50, 100, 200, 400] as const

function parseNumericSerialLine(line: string): NumericSnapshot | null {
  const values: NumericSnapshot = {}
  const namedPattern = /([A-Za-z_][\w -]*?)\s*[:=]\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/gi
  let match: RegExpExecArray | null
  while ((match = namedPattern.exec(line)) !== null) {
    const value = Number(match[2])
    if (Number.isFinite(value)) values[match[1].trim()] = value
  }
  if (Object.keys(values).length > 0) return values

  const tokens = line.trim().split(/[\s,;\t]+/).filter(Boolean)
  if (tokens.length === 0) return null
  tokens.forEach((token, index) => {
    const value = Number(token)
    if (Number.isFinite(value)) values[`Series ${index + 1}`] = value
  })
  return Object.keys(values).length > 0 ? values : null
}

function formatTime(ms: number) {
  const d = new Date(ms)
  const p = (n: number, w = 2) => String(n).padStart(w, "0")
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

function niceNumber(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  const abs = Math.abs(value)
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2
  return String(Number(value.toFixed(digits)))
}

function download(filename: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function IconButton({ label, onClick, active, disabled, children }: { label: string; onClick: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
        active && "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  )
}

export function SerialToolsPanel({ mode, onClose, runtimeAvailable }: SerialToolsPanelProps) {
  const { state } = useSimulator()
  const [baudRate, setBaudRate] = useState<number | null>(null)
  const board = state.components.find((component) => component.type === "arduino-uno" || component.type === "esp32-devkit")
  const live = runtimeAvailable && state.isRunning
  const canSend = live && board?.type === "arduino-uno"

  // --- Monitor state -------------------------------------------------------
  const [lines, setLines] = useState<SerialLine[]>([])
  const [partial, setPartial] = useState("")
  const lineIdRef = useRef(0)
  const partialRef = useRef("")
  const [autoScroll, setAutoScroll] = useState(true)
  const [showTimestamps, setShowTimestamps] = useState(false)
  const [filter, setFilter] = useState("")
  const [serialInput, setSerialInput] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const historyIndexRef = useRef(-1)
  const terminalRef = useRef<HTMLDivElement>(null)

  // --- Plotter state -------------------------------------------------------
  const [samples, setSamples] = useState<NumericSnapshot[]>([])
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const [windowSize, setWindowSize] = useState<number>(100)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [separateScales, setSeparateScales] = useState(false)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  useEffect(() => { pausedRef.current = paused }, [paused])

  useEffect(() => {
    const receiveChunk = (event: Event) => {
      const chunk = (event as CustomEvent<string>).detail
      if (typeof chunk !== "string") return
      const parts = (partialRef.current + chunk).replace(/\r\n?/g, "\n").split("\n")
      const rest = (parts.pop() ?? "").slice(-2000)
      partialRef.current = rest
      setPartial(rest)
      if (parts.length > 0) {
        const now = Date.now()
        setLines((existing) => [...existing, ...parts.map((text) => ({ id: lineIdRef.current++, time: now, text }))].slice(-MAX_LINES))
      }
    }
    const receiveLine = (event: Event) => {
      if (pausedRef.current) return
      const line = (event as CustomEvent<string>).detail
      if (typeof line !== "string") return
      const parsed = parseNumericSerialLine(line)
      if (parsed) setSamples((current) => [...current.slice(-(MAX_SAMPLES - 1)), parsed])
    }
    const receiveConfiguration = (event: Event) => {
      const detail = (event as CustomEvent<{ baudRate?: number | null }>).detail
      setBaudRate(typeof detail?.baudRate === "number" ? detail.baudRate : null)
    }
    window.addEventListener("simulator:serial-chunk", receiveChunk)
    window.addEventListener("simulator:serial-output", receiveLine)
    window.addEventListener("simulator:serial-config", receiveConfiguration)
    return () => {
      window.removeEventListener("simulator:serial-chunk", receiveChunk)
      window.removeEventListener("simulator:serial-output", receiveLine)
      window.removeEventListener("simulator:serial-config", receiveConfiguration)
    }
  }, [])

  useEffect(() => {
    if (mode === "monitor" && autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [mode, autoScroll, lines, partial])

  const visibleLines = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? lines.filter((line) => line.text.toLowerCase().includes(q)) : lines
  }, [lines, filter])

  const sendSerialInput = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = serialInput
    if (!canSend || !text.trim()) return
    window.dispatchEvent(new CustomEvent("simulator:serial-input", { detail: text }))
    setHistory((h) => [text, ...h.filter((x) => x !== text)].slice(0, 30))
    historyIndexRef.current = -1
    setSerialInput("")
  }

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
    event.preventDefault()
    const next = historyIndexRef.current + (event.key === "ArrowUp" ? 1 : -1)
    if (next < -1 || next >= history.length) return
    historyIndexRef.current = next
    setSerialInput(next === -1 ? "" : history[next])
  }

  const clearAll = useCallback(() => {
    if (mode === "monitor") { setLines([]); partialRef.current = ""; setPartial("") } else { setSamples([]) }
  }, [mode])

  const copyOutput = () => {
    const text = lines.map((l) => (showTimestamps ? `[${formatTime(l.time)}] ` : "") + l.text).join("\n")
    void navigator.clipboard?.writeText(text).catch(() => undefined)
  }

  // --- Plotter derived data ------------------------------------------------
  const seriesKeys = useMemo(
    () => [...new Set(samples.flatMap((sample) => Object.keys(sample)))].slice(0, TRACE_COLORS.length),
    [samples],
  )
  const view = useMemo(() => samples.slice(-windowSize), [samples, windowSize])
  const activeKeys = seriesKeys.filter((key) => !hidden.has(key))

  const scale = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (const sample of view) for (const key of activeKeys) {
      const v = sample[key]
      if (typeof v === "number") { min = Math.min(min, v); max = Math.max(max, v) }
    }
    if (!Number.isFinite(min)) return { min: 0, max: 1 }
    if (min === max) { const pad = Math.abs(min) * 0.1 || 1; return { min: min - pad, max: max + pad } }
    const pad = (max - min) * 0.08
    return { min: min - pad, max: max + pad }
  }, [view, activeKeys])

  const stats = useMemo(() => Object.fromEntries(seriesKeys.map((key) => {
    const values = view.map((s) => s[key]).filter((v): v is number => typeof v === "number")
    return [key, { last: values.at(-1), min: values.length ? Math.min(...values) : undefined, max: values.length ? Math.max(...values) : undefined }]
  })), [seriesKeys, view])

  const ranges = useMemo(() => Object.fromEntries(seriesKeys.map((key) => {
    const values = view.map((x) => x[key]).filter((v): v is number => typeof v === "number")
    let lo = values.length ? Math.min(...values) : 0
    let hi = values.length ? Math.max(...values) : 1
    if (lo === hi) { const pad = Math.abs(lo) * 0.1 || 1; lo -= pad; hi += pad }
    return [key, { lo, hi }]
  })), [seriesKeys, view])

  const W = 640, H = 200, L = 46, R = 10, T = 10, B = 18
  const xAt = (i: number) => L + (view.length <= 1 ? 0 : (i / (view.length - 1)) * (W - L - R))
  const yAt = (v: number, key?: string) => {
    const r = separateScales && key && ranges[key] ? { min: ranges[key].lo, max: ranges[key].hi } : scale
    return T + (1 - (v - r.min) / (r.max - r.min)) * (H - T - B)
  }
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => scale.min + (scale.max - scale.min) * f)

  const exportCsv = () => {
    const header = ["sample", ...seriesKeys].join(",")
    const rows = samples.map((s, i) => [i, ...seriesKeys.map((k) => s[k] ?? "")].join(","))
    download("serial-plot.csv", [header, ...rows].join("\n"), "text/csv")
  }

  const statusChip = (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide", live ? "bg-status-running/15 text-status-running" : "bg-muted text-muted-foreground")}>
      <span className={cn("size-1.5 rounded-full", live ? "animate-pulse bg-status-running" : "bg-muted-foreground/60")} />
      {live ? (mode === "plotter" && paused ? "Paused" : "Live") : "Idle"}
    </span>
  )

  return (
    <aside className="sim-panel serial-dock @container absolute inset-y-0 right-0 z-20 flex h-full w-[min(26rem,calc(100vw-3rem))] max-w-96 shrink-0 flex-col border-l border-border shadow-2xl animate-in slide-in-from-right-4 fade-in duration-200">
      <header className="flex items-center gap-2 border-b border-border/80 px-3 py-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          {mode === "monitor" ? <Terminal className="size-3.5" /> : <Activity className="size-3.5" />}
        </div>
        <h2 className="text-[13px] font-bold tracking-tight">{mode === "monitor" ? "Serial Monitor" : "Serial Plotter"}</h2>
        {statusChip}
        <span className="hidden truncate font-mono text-[10px] text-muted-foreground @lg:inline">{board?.name ?? "No supported board"} · {baudRate ? `${baudRate.toLocaleString()} baud` : "— baud"}</span>
        <div className="ml-auto flex items-center gap-0.5">
          {mode === "monitor" ? (
            <>
              <IconButton label={showTimestamps ? "Hide timestamps" : "Show timestamps"} active={showTimestamps} onClick={() => setShowTimestamps((v) => !v)}><Clock className="size-3.5" /></IconButton>
              <IconButton label={autoScroll ? "Auto-scroll on" : "Auto-scroll off"} active={autoScroll} onClick={() => setAutoScroll((v) => !v)}><ArrowDownToLine className="size-3.5" /></IconButton>
              <IconButton label="Copy output" onClick={copyOutput} disabled={lines.length === 0}><Copy className="size-3.5" /></IconButton>
              <IconButton label="Download .txt" onClick={() => download("serial-log.txt", lines.map((l) => `[${formatTime(l.time)}] ${l.text}`).join("\n"))} disabled={lines.length === 0}><Download className="size-3.5" /></IconButton>
            </>
          ) : (
            <>
              <IconButton label={paused ? "Resume plotting" : "Pause plotting"} active={paused} onClick={() => setPaused((v) => !v)}>{paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}</IconButton>
              <IconButton label="Download CSV" onClick={exportCsv} disabled={samples.length === 0}><Download className="size-3.5" /></IconButton>
            </>
          )}
          <IconButton label={mode === "monitor" ? "Clear monitor" : "Clear plot"} onClick={clearAll}><Trash2 className="size-3.5" /></IconButton>
          <IconButton label="Close" onClick={onClose}><X className="size-4" /></IconButton>
        </div>
      </header>

      {mode === "monitor" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter output…" aria-label="Filter serial output" className="min-w-0 flex-1 bg-transparent font-mono text-[11px] outline-none placeholder:text-muted-foreground" />
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{filter ? `${visibleLines.length}/` : ""}{lines.length} lines</span>
          </div>
          <div
            ref={terminalRef}
            onScroll={(e) => {
              const el = e.currentTarget
              const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
              if (!atBottom && autoScroll) setAutoScroll(false)
              else if (atBottom && !autoScroll) setAutoScroll(true)
            }}
            className="sim-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#0a1220] px-3 py-2 font-mono text-[11px] leading-[1.55] text-[#d5e5f7]"
            role="log"
            aria-live="off"
          >
            {visibleLines.length === 0 && !partial ? (
              <div className="flex h-full min-h-24 flex-col items-center justify-center text-center">
                <Radio className="size-5 text-[#4DA3FF]/50" />
                <p className="mt-2 text-xs font-semibold">{runtimeAvailable ? "Waiting for serial output" : "Serial bridge offline"}</p>
                <p className="mt-1 max-w-72 text-[10px] leading-relaxed text-[#8fa6c0]">
                  {runtimeAvailable ? "Serial.print() output from the running Arduino Uno sketch appears here." : "Compile an Arduino Uno sketch or load a project, then start the simulation."}
                </p>
              </div>
            ) : (
              <>
                {visibleLines.map((line) => (
                  <div key={line.id} className="flex gap-3 whitespace-pre-wrap break-words">
                    {showTimestamps && <span className="shrink-0 select-none text-[#5f7896]">{formatTime(line.time)}</span>}
                    <span>{line.text || " "}</span>
                  </div>
                ))}
                {partial && !filter && <div className="whitespace-pre-wrap break-words text-[#9fb6d0]">{partial}<span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-[#4DA3FF]" /></div>}
              </>
            )}
          </div>
          <form onSubmit={sendSerialInput} className="flex items-center gap-2 border-t border-border/70 bg-card px-3 py-2">
            <span className="font-mono text-xs text-primary">›</span>
            <input
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              onKeyDown={onInputKeyDown}
              disabled={!canSend}
              placeholder={canSend ? "Send to Serial.read()  ·  ↑ history" : "Run an Arduino Uno sketch to send input"}
              aria-label="Serial input"
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 font-mono text-[11px] outline-none focus-visible:border-primary disabled:opacity-50"
            />
            <button type="submit" disabled={!canSend || !serialInput.trim()} className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-[11px] font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">
              <Send className="size-3" /> Send
            </button>
          </form>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5">
            <span className="font-mono text-[10px] text-muted-foreground">{seriesKeys.length} series · {samples.length} samples</span>
            <button type="button" onClick={() => setSeparateScales((v) => !v)} aria-pressed={separateScales} title="Give each series its own 0–100% scale" className={cn("ml-auto rounded-md border px-2 py-1 text-[10px] font-semibold", separateScales ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:text-foreground")}>Separate scales</button>
            <div className="flex items-center rounded-md border border-border/70 p-0.5" role="group" aria-label="Samples shown">
              {WINDOWS.map((size) => (
                <button key={size} type="button" onClick={() => setWindowSize(size)} aria-pressed={windowSize === size} className={cn("rounded px-2 py-0.5 font-mono text-[10px]", windowSize === size ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{size}</button>
              ))}
            </div>
          </div>

          {seriesKeys.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
              <Activity className="size-6 text-muted-foreground/45" />
              <p className="mt-2 text-xs font-semibold">No numeric serial data yet</p>
              <p className="mt-1 max-w-80 text-[10px] leading-relaxed text-muted-foreground">Print numbers with Serial.println(), or label several values like <span className="font-mono">temp:24,hum:52</span> to get one trace each.</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col @2xl:flex-row">
              <div className="relative min-h-0 flex-1 p-2">
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="Live serial plot"
                  className="h-full w-full text-foreground"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = ((e.clientX - rect.left) / rect.width) * W
                    const idx = Math.round(((x - L) / (W - L - R)) * (view.length - 1))
                    setHoverIndex(view.length ? Math.max(0, Math.min(view.length - 1, idx)) : null)
                  }}
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  {ticks.map((t, i) => (
                    <g key={i}>
                      <line x1={L} x2={W - R} y1={yAt(t)} y2={yAt(t)} stroke="currentColor" strokeOpacity={i === 0 ? 0.3 : 0.1} vectorEffect="non-scaling-stroke" />
                      <text x={L - 5} y={yAt(t) + 3} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.55" fontFamily="ui-monospace, monospace">{separateScales ? `${[0, 25, 50, 75, 100][i]}%` : niceNumber(t)}</text>
                    </g>
                  ))}
                  {activeKeys.map((key) => {
                    const color = TRACE_COLORS[seriesKeys.indexOf(key)]
                    let started = false
                    const d = view.map((s, i) => {
                      const v = s[key]
                      if (typeof v !== "number") return ""
                      const cmd = started ? "L" : "M"
                      started = true
                      return `${cmd}${xAt(i).toFixed(1)} ${yAt(v, key).toFixed(1)}`
                    }).filter(Boolean).join(" ")
                    return <path key={key} d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  })}
                  {hoverIndex !== null && view[hoverIndex] && (
                    <g>
                      <line x1={xAt(hoverIndex)} x2={xAt(hoverIndex)} y1={T} y2={H - B} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                      {activeKeys.map((key) => typeof view[hoverIndex][key] === "number" && <circle key={key} cx={xAt(hoverIndex)} cy={yAt(view[hoverIndex][key], key)} r="3" fill={TRACE_COLORS[seriesKeys.indexOf(key)]} />)}
                    </g>
                  )}
                </svg>
                {hoverIndex !== null && view[hoverIndex] && (
                  <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-border bg-popover/95 px-2 py-1 font-mono text-[10px] shadow-md">
                    <div className="text-muted-foreground">sample {samples.length - view.length + hoverIndex + 1}</div>
                    {activeKeys.map((key) => <div key={key} className="flex items-center gap-1.5"><span className="size-1.5 rounded-full" style={{ backgroundColor: TRACE_COLORS[seriesKeys.indexOf(key)] }} />{key}: {niceNumber(view[hoverIndex][key])}</div>)}
                  </div>
                )}
              </div>

              <ul className="sim-scrollbar flex shrink-0 gap-2 overflow-x-auto border-t border-border/60 px-3 py-2 @2xl:w-56 @2xl:flex-col @2xl:overflow-y-auto @2xl:border-l @2xl:border-t-0">
                {seriesKeys.map((key, index) => {
                  const off = hidden.has(key)
                  const s = stats[key]
                  return (
                    <li key={key} className="shrink-0">
                      <button type="button" aria-pressed={!off} onClick={() => setHidden((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next })}
                        className={cn("flex w-full min-w-28 items-start gap-2 rounded-lg border border-border/70 px-2.5 py-1.5 text-left transition-opacity hover:border-primary/40", off && "opacity-45")}>
                        <span className="mt-1 size-2 shrink-0 rounded-full" style={{ backgroundColor: TRACE_COLORS[index] }} />
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-semibold">{key}</span>
                          <span className="block font-mono text-[10px] text-foreground">{niceNumber(s?.last ?? NaN)}</span>
                          <span className="block font-mono text-[9px] text-muted-foreground">{niceNumber(s?.min ?? NaN)} – {niceNumber(s?.max ?? NaN)}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
